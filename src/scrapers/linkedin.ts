/**
 * LinkedIn Scraper — Phase 1
 *
 * Scrapes LinkedIn company search results using Playwright.
 * Target: public company pages accessible without login (or with a headless session).
 *
 * What we extract per company:
 *   - Company name, tagline, description
 *   - Industry, company size (employees range), headquarters
 *   - Follower count
 *   - Founded year
 *   - Specialties
 *   - Website URL (→ feeds into WebsiteScraper)
 *   - Recent post count (activity signal)
 *
 * Rate limiting: max 15 req/min per session; jitter 1–3s between pages.
 * Proxy: rotating residential proxies required for production scale.
 *
 * DECISION (logged in DECISIONS.md):
 *   Using Playwright with stealth plugin (playwright-extra + puppeteer-extra-plugin-stealth)
 *   to reduce bot detection. LinkedIn actively blocks headless sessions; proxy rotation
 *   and session cookie reuse are required for sustained scraping. Google login / Auth0
 *   session sharing with the scraper worker is a Phase 2 optimization.
 */

import {
  LeadSourceScraper,
  BrowserConfig,
  DEFAULT_BROWSER_CONFIG,
} from "./base";
import {
  LeadSource,
  SearchResult,
  ScraperParams,
  RawLeadData,
  NormalizedLead,
  LinkedInData,
} from "@/lib/types";
import { computeOpportunitySignals } from "./signals";

// ─── Selectors ────────────────────────────────────────────────────────────────
// These target the public company search results page:
// https://www.linkedin.com/search/results/companies/?keywords={query}&geoUrn={location}
// Updated: 2025-07 — LinkedIn DOM changes frequently; add version comment on each update.

const LINKEDIN_SELECTORS = {
  resultList:      ".search-results-container ul",
  resultItem:      "li.reusable-search__result-container",
  companyName:     ".entity-result__title-text a span[aria-hidden='true']",
  companyLink:     ".entity-result__title-text a",
  tagline:         ".entity-result__primary-subtitle",
  description:     ".entity-result__summary",
  location:        ".entity-result__secondary-subtitle",
  // On individual company page:
  followerCount:   ".org-top-card-summary-info-list__info-item:first-child",
  employeeRange:   ".org-page-details__definition-text:nth-child(2)",
  website:         ".org-page-details__definition-text a[data-tracking-control-name='organization-website']",
  specialties:     ".org-page-details__specialities",
  foundedYear:     ".org-page-details__definition-text:last-child",
};

// ─── LinkedIn Scraper ─────────────────────────────────────────────────────────

export class LinkedInScraper implements LeadSourceScraper {
  readonly id: LeadSource = "linkedin";
  readonly label = "LinkedIn";
  readonly selectors = LINKEDIN_SELECTORS;

  async fetch(
    params: ScraperParams,
    config?: Partial<BrowserConfig>
  ): Promise<RawLeadData[]> {
    const cfg = { ...DEFAULT_BROWSER_CONFIG, ...config };
    const limit = params.limit ?? 20;

    /**
     * PRODUCTION IMPLEMENTATION:
     *
     * const { chromium } = await import("playwright-extra");
     * const stealth = await import("puppeteer-extra-plugin-stealth");
     * chromium.use(stealth.default());
     *
     * const browser = await chromium.launch({
     *   headless: cfg.headless,
     *   proxy: cfg.proxy ? {
     *     server:   cfg.proxy.server,
     *     username: cfg.proxy.username,
     *     password: cfg.proxy.password,
     *   } : undefined,
     * });
     *
     * const context = await browser.newContext({
     *   userAgent: cfg.userAgent ?? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
     *   viewport:  { width: 1280, height: 900 },
     *   // Load persisted cookies/session if available to avoid repeated logins
     *   storageState: process.env.LINKEDIN_SESSION_PATH ?? undefined,
     * });
     *
     * const page = await context.newPage();
     * const query = encodeURIComponent(params.query);
     * const geoUrn = params.location ? await resolveLinkedInGeoUrn(params.location) : "";
     * const url = `https://www.linkedin.com/search/results/companies/?keywords=${query}${geoUrn ? `&geoUrn=${geoUrn}` : ""}`;
     *
     * await page.goto(url, { waitUntil: "networkidle", timeout: cfg.timeout });
     * await page.waitForSelector(LINKEDIN_SELECTORS.resultList, { timeout: cfg.timeout });
     *
     * // Pagination loop up to `limit` results
     * const rawItems: RawLeadData[] = [];
     * while (rawItems.length < limit) {
     *   const items = await page.$$(LINKEDIN_SELECTORS.resultItem);
     *   for (const item of items.slice(rawItems.length)) {
     *     const html = await item.innerHTML();
     *     rawItems.push({ sourceId: "linkedin", raw: { html } });
     *   }
     *   // Click "Next" if available, else break
     *   const nextBtn = await page.$("button[aria-label='Next']");
     *   if (!nextBtn || rawItems.length >= limit) break;
     *   await nextBtn.click();
     *   await page.waitForTimeout(cfg.rateLimit.jitterMs + Math.random() * cfg.rateLimit.jitterMs);
     * }
     *
     * await browser.close();
     * return rawItems.slice(0, limit);
     */

    // PHASE 1 STUB — returns empty array; real impl above replaces this.
    // The orchestrator handles the empty result gracefully (no crash, no UI error).
    console.log(`[LinkedIn] fetch called: query="${params.query}" location="${params.location ?? ""}"`);
    return [];
  }

  parse(raw: RawLeadData): NormalizedLead {
    /**
     * PRODUCTION:
     * const { html } = raw.raw as { html: string };
     * const $ = cheerio.load(html);
     *
     * const name    = $(LINKEDIN_SELECTORS.companyName).first().text().trim();
     * const tagline = $(LINKEDIN_SELECTORS.tagline).first().text().trim();
     * const desc    = $(LINKEDIN_SELECTORS.description).first().text().trim();
     * const location = $(LINKEDIN_SELECTORS.location).first().text().trim();
     * const link    = $(LINKEDIN_SELECTORS.companyLink).first().attr("href") ?? "";
     *
     * // Extract domain from LinkedIn "website" field on company page
     * // (requires a follow-up page.goto() on the company URL — done in fetch() enrichment pass)
     * const website = (raw.raw as any).website ?? "";
     * const domain  = website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
     *
     * const linkedin: LinkedInData = {
     *   followers:     parseFollowers((raw.raw as any).followers ?? ""),
     *   employees:     (raw.raw as any).employeeRange ?? "",
     *   headquarters:  location,
     *   industry:      tagline.split("·")[0]?.trim(),
     *   foundedYear:   parseInt((raw.raw as any).foundedYear ?? "0") || undefined,
     *   specialties:   ((raw.raw as any).specialties ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
     *   recentPosts:   (raw.raw as any).recentPosts ?? 0,
     * };
     *
     * return { name, domain, description: desc || tagline, location, industry: linkedin.industry, sourceData: { linkedin } };
     */

    // Stub
    const { name, domain } = raw.raw as { name: string; domain: string };
    return {
      name,
      domain,
      description: "",
      sourceData: { linkedin: {} },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const li = lead.sourceData.linkedin as LinkedInData | undefined;
    const signals = computeOpportunitySignals({ linkedin: li });

    return {
      id: `linkedin-${normalizeDomainKey(lead.domain)}`,
      name: lead.name,
      domain: lead.domain,
      description: lead.description,
      source: sourceId,
      sources: [sourceId],
      location: lead.location,
      industry: lead.industry,
      employees: li?.employees,
      linkedin: li,
      opportunitySignals: signals,
      isSaved: false,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeDomainKey(domain: string): string {
  return domain.replace(/^www\./, "").replace(/\./g, "-");
}

function parseFollowers(text: string): number | undefined {
  const cleaned = text.replace(/,/g, "").toLowerCase();
  const match = cleaned.match(/(\d+(\.\d+)?)\s*k?/);
  if (!match) return undefined;
  const num = parseFloat(match[1]);
  return cleaned.includes("k") ? Math.round(num * 1000) : Math.round(num);
}
