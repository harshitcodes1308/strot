/**
 * Google Maps Scraper - Phase 1
 *
 * Primary data source for local/physical businesses.
 * Scrapes Google Maps search results via:
 *   - Google Places API (preferred where budget allows - compliant, fast)
 *   - Playwright scraper of maps.google.com as fallback
 */

import {
  LeadSourceScraper,
  BrowserConfig,
  DEFAULT_BROWSER_CONFIG,
  withRetry,
} from "./base";
import {
  LeadSource,
  SearchResult,
  ScraperParams,
  RawLeadData,
  NormalizedLead,
  GoogleMapsData,
} from "@/lib/types";
import { computeOpportunitySignals } from "./signals";

// ─── Selectors (Playwright fallback) ─────────────────────────────────────────

const GOOGLE_MAPS_SELECTORS = {
  resultList:   "div[role='feed']",
  resultItem:   "div.Nv2PK",
  name:         ".qBF1Pd",
  rating:       ".MW4etd",
  reviewCount:  ".UY7F9",
  category:     ".W4Efsd:first-child .W4Efsd span:last-child",
  address:      ".W4Efsd:nth-child(2) .W4Efsd span:last-child",
  website:      "a[data-item-id='authority']",
  phone:        "a[data-item-id*='phone']",
};

// ─── Google Maps Scraper ──────────────────────────────────────────────────────

export class GoogleMapsScraper implements LeadSourceScraper {
  readonly id: LeadSource = "google_maps";
  readonly label = "Google Maps";
  readonly selectors = GOOGLE_MAPS_SELECTORS;

  async fetch(
    params: ScraperParams,
    config?: Partial<BrowserConfig>
  ): Promise<RawLeadData[]> {
    const cfg = { ...DEFAULT_BROWSER_CONFIG, ...config };
    const limit = params.limit ?? 20;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    return withRetry(async () => {
      let results: RawLeadData[] = [];
      if (apiKey) {
        try {
          results = await this._fetchViaAPI(params, apiKey, limit);
        } catch (e) {
          console.warn("[GoogleMaps] API failed, falling back to scraper", e);
        }
      }
      // If API yielded fewer than limit (e.g. pagination failed), use Playwright to get more
      if (results.length < limit) {
        try {
          const scraperResults = await this._fetchViaScraper(params, cfg, limit);
          // Append and deduplicate by name
          const seen = new Set(results.map(r => r.raw.place?.displayName?.text || ""));
          for (const sr of scraperResults) {
            const name = (sr.raw as any).html ? (sr.raw as any).html.match(/class="qBF1Pd"[^>]*>([^<]+)/)?.[1] : "";
            if (name && !seen.has(name)) {
              results.push(sr);
            }
          }
        } catch (e) {
          console.warn("[GoogleMaps] Scraper fallback failed", e);
        }
      }
      return results.slice(0, limit);
    }, cfg.retries, cfg.retryDelayMs);
  }

  private async _fetchViaAPI(
    params: ScraperParams,
    apiKey: string,
    limit: number
  ): Promise<RawLeadData[]> {
    const textQuery = [params.query, params.location].filter(Boolean).join(" in ");
    const allPlaces: GooglePlaceResult[] = [];
    let pageToken: string | undefined = undefined;

    while (allPlaces.length < limit) {
      const body: any = {
        textQuery,
        maxResultCount: 20, // API max per page
        languageCode: "en",
      };
      if (pageToken) {
        body.pageToken = pageToken;
      }

      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.rating",
            "places.userRatingCount",
            "places.primaryType",
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.businessStatus",
            "places.regularOpeningHours.weekdayDescriptions",
            "places.photos",
            "places.reviews",
            "nextPageToken",
          ].join(","),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const msg = `[GoogleMaps] Places API error: ${response.status} ${await response.text()}`;
        console.error(msg);
        throw new Error(msg);
      }

      const data = await response.json() as { places?: GooglePlaceResult[], nextPageToken?: string };
      if (data.places) {
        allPlaces.push(...data.places);
      }

      if (data.nextPageToken && allPlaces.length < limit) {
        pageToken = data.nextPageToken;
        // Google requires a short delay before using nextPageToken
        await new Promise(r => setTimeout(r, 2000));
      } else {
        break;
      }
    }

    return allPlaces.slice(0, limit).map(place => ({
      sourceId: "google_maps" as LeadSource,
      raw: { place },
    }));
  }

  /** Playwright fallback when no API key */
  private async _fetchViaScraper(
    params: ScraperParams,
    cfg: BrowserConfig,
    limit: number
  ): Promise<RawLeadData[]> {
    try {
      const { chromium } = await import("playwright-extra");
      const stealth = await (import("puppeteer-extra-plugin-stealth") as any);
      chromium.use(stealth.default());
 
      const browser = await chromium.launch({ headless: true, proxy: cfg.proxy ? { server: cfg.proxy.server } : undefined });
      const page = await browser.newPage();
 
      const query = encodeURIComponent(`${params.query} ${params.location ?? ""}`);
      await page.goto(`https://www.google.com/maps/search/${query}`, { waitUntil: "domcontentloaded" });
 
      try {
        await page.waitForSelector(GOOGLE_MAPS_SELECTORS.resultList, { timeout: 15000 });
      
        // Scroll to load more results
        const feed = await page.$(GOOGLE_MAPS_SELECTORS.resultList);
        for (let i = 0; i < 3 && i * 10 < limit; i++) {
          await feed?.evaluate(el => (el.scrollTop += el.scrollHeight));
          await page.waitForTimeout(1500);
        }
      } catch (e) {
        console.warn(`[GoogleMaps] Failed to find result list for ${query}`);
      }
 
      const items = await page.$$(GOOGLE_MAPS_SELECTORS.resultItem);
      const rawItems: RawLeadData[] = [];
 
      for (const item of items.slice(0, limit)) {
        const html = await item.innerHTML();
        rawItems.push({ sourceId: "google_maps", raw: { html } });
      }
 
      await browser.close();
      
      if (rawItems.length === 0) {
        console.warn(`[GoogleMaps] No results found for ${query}`);
        return [];
      }
      
      return rawItems;
    } catch (e: any) {
      console.warn(`[GoogleMaps] Playwright error:`, e.message);
      throw e;
    }
  }



  parse(raw: RawLeadData): NormalizedLead {
    if (raw.raw && raw.raw.place) {
      // API path
      const place = raw.raw.place as GooglePlaceResult;
      const google: GoogleMapsData = {
        placeId:      place.id,
        rating:       place.rating ?? 0,
        reviewCount:  place.userRatingCount ?? 0,
        category:     humanizeCategory(place.primaryType ?? ""),
        address:      place.formattedAddress ?? "",
        phone:        place.nationalPhoneNumber,
        website:      place.websiteUri,
        hours:        place.regularOpeningHours?.weekdayDescriptions?.join(", "),
        claimedListing: place.businessStatus === "OPERATIONAL",
      };

      const domain = place.websiteUri
        ? place.websiteUri.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
        : null;

      let photoUrls: string[] = [];
      if (place.photos && place.photos.length > 0) {
        photoUrls = place.photos.slice(0, 6).map(p => 
          `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=800&maxWidthPx=800&key=${process.env.GOOGLE_PLACES_API_KEY}`
        );
      }

      // Extract raw reviews texts
      const rawReviews = (place.reviews || [])
        .map(r => r.text?.text)
        .filter(Boolean) as string[];

      google.reviews = rawReviews;

      const id = `google-${place.id || require("crypto").createHash("md5").update(place.displayName.text).digest("hex")}`;
      return {
        id,
        name:        place.displayName.text,
        domain,
        description: `${humanizeCategory(place.primaryType ?? "")} - ${place.formattedAddress}. ${place.rating}★ (${place.userRatingCount} reviews).`,
        location:    extractCity(place.formattedAddress ?? ""),
        industry:    humanizeCategory(place.primaryType ?? ""),
        sourceData:  { google, photoUrls },
      };
    }

    // DOM path
    const { html } = (raw.raw || {}) as { html: string };
    const cheerio = require("cheerio");
    const $ = cheerio.load(html || "");
    
    const name = $(GOOGLE_MAPS_SELECTORS.name).text().trim() || "Unknown Location";
    const rating = parseFloat($(GOOGLE_MAPS_SELECTORS.rating).text().trim()) || 0;
    const reviewText = $(GOOGLE_MAPS_SELECTORS.reviewCount).text().replace(/[^0-9]/g, "");
    const reviewCount = parseInt(reviewText) || 0;
    const category = $(GOOGLE_MAPS_SELECTORS.category).text().trim();
    const address = $(GOOGLE_MAPS_SELECTORS.address).text().trim();
    const website = $(GOOGLE_MAPS_SELECTORS.website).attr("href") ?? "";
    const phone = $(GOOGLE_MAPS_SELECTORS.phone).attr("href")?.replace("tel:", "") ?? "";
    
    const domain = website ? website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : null;
    const google: GoogleMapsData = { rating, reviewCount, category, address, phone, website };
    
    const id = `google-${require("crypto").createHash("md5").update(name + address).digest("hex")}`;
    return { 
      id,
      name, 
      domain, 
      description: `${category} - ${address}. ${rating}★ (${reviewCount} reviews).`, 
      location: extractCity(address), 
      industry: category, 
      sourceData: { google } 
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const g = lead.sourceData.google as GoogleMapsData | undefined;
    const signals = computeOpportunitySignals({ google: g });

    const hasWebsite = !!g?.website || !!lead.domain;
    let dataCompleteness = 30;
    if (g?.phone) dataCompleteness += 20;
    if (hasWebsite) dataCompleteness += 20;
    if (lead.location) dataCompleteness += 10;
    if (g?.rating) dataCompleteness += 10;
    if (g?.reviewCount) dataCompleteness += 10;

    return {
      id: lead.id || `google-${g?.placeId ?? (lead.domain ?? Math.random().toString(36).slice(2)).replace(/\./g, "-")}`,
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? null,
      avatar: (lead.sourceData?.photoUrls?.[0]) 
        ?? (lead.domain ? `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128` : null),
      source: sourceId,
      sourceUrl: g?.placeId 
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name)}&query_place_id=${g.placeId}` 
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name)}`,
      profileUrl: g?.website || (g?.placeId 
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name)}&query_place_id=${g.placeId}` 
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name)}`),
      socialProfiles: {},
      sources: [sourceId],
      emails: [],
      phones: g?.phone ? [g.phone] : [],
      location: lead.location ?? null,
      industry: lead.industry ?? null,
      employeeCount: lead.employees ?? null,
      foundedYear: null,
      followers: null,
      engagement: null,
      rating: g?.rating ?? null,
      reviewCount: g?.reviewCount ?? null,
      techStack: [],
      hasWebsite,
      isRunningAds: false,
      dataCompleteness,
      
      google: g,
      opportunitySignals: signals,
      isSaved: false,
      photos: (lead.sourceData?.photoUrls as string[]) || [],
      painPoints: [], // Will be filled by background job
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GooglePlaceResult {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
  regularOpeningHours?: { weekdayDescriptions: string[] };
  photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
  reviews?: Array<{ text?: { text: string } }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanizeCategory(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function extractCity(address: string): string {
  const parts = address.split(",").map(p => p.trim());
  return parts.length >= 2 ? `${parts[1]}, ${parts[2]?.split(" ")[0] ?? ""}`.trim() : address;
}
