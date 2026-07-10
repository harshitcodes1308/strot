/**
 * Website Scraper - Phase 1
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
  WebsiteData,
} from "@/lib/types";
import { searchDuckDuckGo } from "@/lib/ddg-search";
import { computeOpportunitySignals } from "./signals";

export const TECH_FINGERPRINTS: Array<{ name: string; patterns: RegExp[] }> = [
  { name: "WordPress",        patterns: [/wp-content/i, /wp-includes/i, /\/wp-json\//i] },
  { name: "Shopify",          patterns: [/cdn\.shopify\.com/i, /shopify\.js/i] },
  { name: "Webflow",          patterns: [/webflow\.com/i, /\.webflow\.io/i] },
  { name: "Squarespace",      patterns: [/squarespace\.com/i, /sqsp\.net/i] },
  { name: "Wix",              patterns: [/wix\.com/i, /wixstatic\.com/i] },
  { name: "Framer",           patterns: [/framerusercontent\.com/i] },
  { name: "HubSpot CMS",      patterns: [/hs-scripts\.com/i, /hubspot\.com/i] },
  { name: "Next.js",          patterns: [/__next/i, /_next\/static/i] },
  { name: "Ghost",            patterns: [/ghost\.io/i, /ghost-sdk/i] },
  { name: "Cargo Collective",  patterns: [/cargocollective\.com/i] },
  { name: "Elementor",        patterns: [/elementor/i] },
  { name: "Divi",             patterns: [/et-pb-/i] },
  { name: "WooCommerce",      patterns: [/woocommerce/i] },
  { name: "BigCommerce",      patterns: [/bigcommerce\.com/i] },
  { name: "Stripe",           patterns: [/js\.stripe\.com/i] },
  { name: "Calendly",         patterns: [/calendly\.com\/assets/i, /data-url="https:\/\/calendly/i] },
  { name: "Google Analytics", patterns: [/gtag\.js/i, /google-analytics\.com/i, /UA-\d+/i, /G-\w+/i] },
  { name: "Meta Pixel",       patterns: [/connect\.facebook\.net\/.*fbevents/i] },
  { name: "Plausible",        patterns: [/plausible\.io/i] },
  { name: "Hotjar",           patterns: [/hotjar\.com/i] },
  { name: "Intercom",         patterns: [/widget\.intercom\.io/i] },
];

const ANALYTICS_PATTERNS = ["Google Analytics", "Meta Pixel", "Plausible", "Hotjar"];
const ECOMMERCE_PATTERNS  = ["Shopify", "WooCommerce", "BigCommerce", "Stripe"];
const CMS_PATTERNS        = ["WordPress", "Webflow", "Squarespace", "Wix", "Framer", "HubSpot CMS", "Ghost", "Cargo Collective"];

// ─── Website Scraper ──────────────────────────────────────────────────────────

export class WebsiteScraper implements LeadSourceScraper {
  readonly id: LeadSource = "website";
  readonly label = "Company Website";
  readonly selectors = {};

  async fetch(
    params: ScraperParams,
    config?: Partial<BrowserConfig>
  ): Promise<RawLeadData[]> {
    const cfg = { ...DEFAULT_BROWSER_CONFIG, ...config };
    const limit = params.limit ?? 10;
    const serpKey = process.env.SERP_API_KEY;

    if (serpKey) {
      return withRetry(async () => {
        const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(params.query + " " + (params.location ?? ""))}&api_key=${serpKey}&num=${limit}`;
        const res = await fetch(searchUrl);
        if (!res.ok) throw new Error(`[WebsiteScraper] SERP API error: ${res.status}`);
        const data = await res.json();
      
        const urls: string[] = (data.organic_results ?? [])
          .map((r: any) => r.link)
          .filter((url: string) => !isBlacklisted(url));
      
        return await Promise.all(urls.slice(0, limit).map(url => this._crawlUrl(url, cfg)));
      }, cfg.retries, cfg.retryDelayMs);
    } else {
      // DuckDuckGo fallback
      const isDomain = params.query.includes(".") && !params.query.includes(" ");
      if (isDomain) {
        return [await this._crawlUrl(params.query, cfg)];
      }

      const { url } = params as any;
      if (url) {
        return [await this._crawlUrl(url, cfg)];
      }

      // We don't have a URL, so we search DDG for the query
      return withRetry(async () => {
        const results = await searchDuckDuckGo(`${params.query} ${params.location ?? ""}`.trim(), limit);
        const urls = results.map(r => r.link).filter(link => !isBlacklisted(link));
        if (urls.length === 0) return [];
        return await Promise.all(urls.slice(0, limit).map(url => this._crawlUrl(url, cfg)));
      }, cfg.retries, cfg.retryDelayMs);
    }
  }

  private async _crawlUrl(
    rawUrl: string,
    cfg: BrowserConfig
  ): Promise<RawLeadData> {
    // Ensure URL has a protocol
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    
    try {
      return await withRetry(async () => {
        // Use native fetch instead of Playwright for extreme speed in bulk discovery
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36" },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`[WebsiteScraper] HTTP error ${response.status} for ${url}`);
        }

        const html = await response.text();
        const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : "";
        const headers = Object.fromEntries(response.headers.entries());
        const statusCode = response.status;
        
        // Extract details immediately to avoid returning 2MB HTML payloads
        const techStack = Array.from(new Set(
          TECH_FINGERPRINTS.filter(t => t.patterns.some(p => p.test(html))).map(t => t.name)
        ));
        
        const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,7}\b/gi;
        const BLACKLIST = [
          "sentry.io", "example.com", "domain.com", "wixpress.com", "wix.com", "cloudflare.com", "test.com", "yourdomain.com", "company.com", "name.com", "email.com", "mysite.com",
          "sentry-", "reply", "no-reply", "noreply", "donotreply", "do-not-reply", "mailer@", "postmaster@", "admin@example", "abuse@", "system@", "notifications@",
          "intl-", "segmenter", "react-", "webpack", "pollyfill"
        ];
        const emailsMatch = html.match(EMAIL_REGEX) || [];
        const mailtoMatches = html.match(/href="mailto:([^"?]+)/gi) || [];
        const emailsSet = new Set<string>();

        const isValidEmail = (e: string) => {
          const lower = e.toLowerCase().trim();
          if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.js') || lower.endsWith('.css') || lower.endsWith('.woff')) return false;
          if (BLACKLIST.some(bad => lower.includes(bad))) return false;
          if (lower.startsWith("user@") || lower.startsWith("email@") || lower.startsWith("info@example") || lower.startsWith("test@") || lower.startsWith("yourname@")) return false;
          if ((lower.match(/@/g) || []).length !== 1) return false;
          // Must not be a hex string or extremely long random string
          if (lower.length > 50 || /^[a-f0-9]{15,}@/i.test(lower) || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/.test(lower)) return false;
          
          // Strict phase 2: if it starts with a ton of numbers, probably fake
          if (/^\d{8,}@/.test(lower)) return false;

          return true;
        };

        emailsMatch.forEach(e => {
          if (isValidEmail(e)) emailsSet.add(e.toLowerCase());
        });
        mailtoMatches.forEach(m => {
          const email = m.replace(/href="mailto:/i, "").trim().toLowerCase();
          if (isValidEmail(email)) emailsSet.add(email);
        });

        // Also extract social media links for fallback enrichment
        const socialsSet = new Set<string>();
        const socialMatches = html.match(/href="(https:\/\/(www\.)?(facebook|instagram|linkedin)\.com\/[^"]+)"/gi) || [];
        socialMatches.forEach(m => {
          const link = m.replace(/href="/i, "").replace(/"$/, "").trim();
          if (!link.includes("/share") && !link.includes("/sharer")) {
            socialsSet.add(link);
          }
        });

        const phonesSet = new Set<string>();
        // Match numbers like +1-800-555-0199 or (212) 555-1234, but avoid matching random digits like " 2023 2024 "
        const phoneRegex = /(?:tel:|Call us:|Phone:)?\s*(\+?\d{1,3}?[-.\s]?\(?\d{1,4}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})\b/gi;
        let phoneMatch;
        while ((phoneMatch = phoneRegex.exec(html)) !== null) {
          const p = phoneMatch[1].trim();
          const digits = p.replace(/\D/g, "");
          // Strict check: must have enough digits, and can't just be a year or zip code
          if (digits.length >= 10 && digits.length <= 15) {
            // Also reject if the string is just a long number like an ID
            if (!/^\d{10,}$/.test(p.replace(/\s/g, ""))) {
              phonesSet.add(p);
            }
          }
        }

        // Deep Spidering: If we missed email/phone, crawl up to 2 contact/about subpages
        if (emailsSet.size === 0 || phonesSet.size === 0) {
          const internalLinks = html.match(/href="(\/[^"]*(contact|about|team)[^"]*)"/gi) || [];
          const absRegex = new RegExp(`href="(https?://(?:www\\.)?${new URL(url).hostname}/[^"]*(?:contact|about|team)[^"]*)"`, 'gi');
          const absLinks = html.match(absRegex) || [];
          
          const uniqueLinks = new Set<string>();
          internalLinks.forEach(m => {
            const link = m.replace(/href="/i, "").replace(/"$/, "").trim();
            uniqueLinks.add(new URL(link, url).toString());
          });
          absLinks.forEach(m => {
            const link = m.replace(/href="/i, "").replace(/"$/, "").trim();
            uniqueLinks.add(link);
          });
          
          const linksToCrawl = Array.from(uniqueLinks).slice(0, 2);
          await Promise.all(linksToCrawl.map(async (subUrl) => {
            try {
              const subRes = await fetch(subUrl, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36" },
                signal: AbortSignal.timeout(8000)
              });
              if (subRes.ok) {
                const subHtml = await subRes.text();
                const subEmails = subHtml.match(EMAIL_REGEX) || [];
                const subMailtos = subHtml.match(/href="mailto:([^"?]+)/gi) || [];
                subEmails.forEach(e => { if (isValidEmail(e)) emailsSet.add(e.toLowerCase()); });
                subMailtos.forEach(m => {
                  const e = m.replace(/href="mailto:/i, "").trim().toLowerCase();
                  if (isValidEmail(e)) emailsSet.add(e);
                });
                
                let subPhoneMatch;
                while ((subPhoneMatch = phoneRegex.exec(subHtml)) !== null) {
                  const p = subPhoneMatch[1].trim();
                  const digits = p.replace(/\D/g, "");
                  if (digits.length >= 10 && digits.length <= 15) {
                    if (!/^\d{10,}$/.test(p.replace(/\s/g, ""))) {
                      phonesSet.add(p);
                    }
                  }
                }
              }
            } catch (e) {
              // Ignore subpage errors
            }
          }));
        }

        const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        let description = descMatch?.[1]?.trim() ?? "";
        // Decode HTML entities
        description = description
          .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        
        return { 
          sourceId: "website", 
          raw: { 
            url, 
            headers, 
            statusCode, 
            title, 
            description,
            extracted: {
              techStack,
              emails: Array.from(emailsSet),
              phones: Array.from(phonesSet).slice(0, 5),
              socials: Array.from(socialsSet),
            } 
          } 
        };
      }, 2, 1000); // Only retry 2 times, fast backoff for individual sites
    } catch (e: any) {
      console.warn(`[Website] Failed to crawl ${url}:`, e.message);
      return { sourceId: "website", raw: { url } };
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const { url, headers, title, description, extracted } = (raw.raw || {}) as any;

    const techStack = extracted?.techStack || [];
    const emails = extracted?.emails || [];
    const phones = extracted?.phones || [];
    const socials = extracted?.socials || [];

    const hasAnalytics = techStack.some((t: string) => ANALYTICS_PATTERNS.includes(t));
    const hasEcommerce = techStack.some((t: string) => ECOMMERCE_PATTERNS.includes(t));
    const cms = techStack.find((t: string) => CMS_PATTERNS.includes(t));

    const hasSSL = url ? url.startsWith("https") : false;
    const lastModified = headers?.["last-modified"] || headers?.["date"] || null;

    const website: WebsiteData = {
      techStack,
      hasAnalytics,
      hasCMS: !!cms,
      hasEcommerce,
      hasSSL,
      cms,
      lastUpdated: lastModified,
    };

    const domain = url ? new URL(url).hostname.replace(/^www\./, "") : "unknown";
    const name = title?.replace(/\s*[-|].*$/, "").trim() ?? domain;

    return { 
      name, 
      domain, 
      description, 
      sourceData: { website, extractedEmails: emails, extractedPhones: phones, extractedSocials: socials } 
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const w = lead.sourceData.website as WebsiteData | undefined;
    const signals = computeOpportunitySignals({ website: w });
    
    const extractedEmails = (lead.sourceData.extractedEmails as string[]) || [];
    const extractedPhones = (lead.sourceData.extractedPhones as string[]) || [];
    const extractedSocials = (lead.sourceData.extractedSocials as string[]) || [];

    // Map extracted socials to socialProfiles object
    const socialProfiles: Record<string, string> = {};
    extractedSocials.forEach(url => {
      if (url.includes("instagram.com")) socialProfiles.instagram = url;
      if (url.includes("facebook.com")) socialProfiles.facebook = url;
      if (url.includes("linkedin.com")) socialProfiles.linkedin = url;
    });

    let dataCompleteness = 30; // base score
    if (w?.techStack?.length) dataCompleteness += 20;
    if (extractedEmails.length > 0) dataCompleteness += 20;
    if (lead.domain) dataCompleteness += 10;
    if (lead.description) dataCompleteness += 20;

    return {
      id: lead.id || `website-${(lead.domain || "unknown").replace(/\./g, "-")}`,
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? null,
      avatar: lead.domain ? `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128` : null,
      source: sourceId,
      sourceUrl: lead.domain ? `https://${lead.domain}` : "",
      profileUrl: lead.domain ? `https://${lead.domain}` : "",
      socialProfiles,
      sources: [sourceId],
      emails: extractedEmails,
      phones: extractedPhones,
      location: lead.location ?? null,
      industry: lead.industry ?? null,
      employeeCount: lead.employees ?? null,
      foundedYear: null,
      followers: null,
      engagement: null,
      rating: null,
      reviewCount: null,
      techStack: w?.techStack ?? [],
      hasWebsite: true,
      isRunningAds: false,
      dataCompleteness,
      
      website: w,
      opportunitySignals: signals,
      isSaved: false,
      photos: [],
      painPoints: [],
    };
  }
}

// ─── Tech Stack Detection ─────────────────────────────────────────────────────

export function detectTechStack(html: string): string[] {
  return TECH_FINGERPRINTS
    .filter(fp => fp.patterns.some(pattern => pattern.test(html)))
    .map(fp => fp.name);
}

// ─── Blacklist (non-company domains to skip in web discovery) ────────────────

const BLACKLISTED_DOMAINS = [
  "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
  "youtube.com", "tiktok.com", "pinterest.com", "reddit.com",
  "yelp.com", "tripadvisor.com", "google.com", "amazon.com",
  "clutch.co", "goodfirms.co", "crunchbase.com", "zoominfo.com",
  "wikipedia.org", "indeed.com", "glassdoor.com", "glassdoor.co.in",
  "justdial.com", "indiamart.com", "yellowpages.com", "foursquare.com",
  "bbb.org", "trustpilot.com", "g2.com", "capterra.com", "upcity.com",
  "expertise.com", "angi.com", "thumbtack.com", "houzz.com", "porch.com",
  "mapquest.com", "superpages.com", "local.yahoo.com", "manta.com",
  "dexknows.com", "chamberofcommerce.com", "hotfrog.com", "ezlocal.com",
  "citysearch.com", "brownbook.net", "merchantcircle.com", "localdatabase.com",
  "nextdoor.com", "whitepages.com", "yp.com", "sulekha.com", "tradeindia.com",
  "exportersindia.com", "ambitionbox.com", "booking.com", "agoda.com",
  "zomato.com", "swiggy.com", "ubereats.com", "doordash.com", "grubhub.com",
  "postmates.com", "justeat.com", "deliveroo.co.uk", "opentable.com", 
  "thefork.com", "michelin.com", "microsoft.com", "apple.com", "play.google.com"
];

export function isBlacklisted(urlOrDomain: string): boolean {
  try {
    // If it's just a domain (no http), add https:// so new URL() can parse it safely
    const safeUrl = urlOrDomain.startsWith("http") ? urlOrDomain : `https://${urlOrDomain}`;
    const hostname = new URL(safeUrl).hostname.replace(/^www\./, "");
    return BLACKLISTED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return true; // Still fallback to true if it's completely malformed
  }
}
