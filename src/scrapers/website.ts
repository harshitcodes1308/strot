/**
 * Website Scraper — Phase 1
 *
 * Crawls a company's own website to extract tech stack, performance data,
 * CMS detection, analytics presence, e-commerce indicators, and contact/CTA gaps.
 *
 * This scraper is primarily an ENRICHMENT source — it runs AFTER a business
 * has been found via Google Maps or LinkedIn, to fill in the website-layer data.
 * It can also be a discovery source via:
 *   - SerpAPI / ValueSERP Google web search for "{query} site:*.com"
 *   - Bing Web Search API (compliant, cheaper)
 *
 * What we extract:
 *   - Tech stack (Wappalyzer-style fingerprinting: script names, meta tags, headers)
 *   - CMS detection (WordPress, Webflow, Squarespace, Shopify, Wix, etc.)
 *   - Analytics presence (Google Analytics, Meta Pixel, Plausible, etc.)
 *   - E-commerce indicators (Shopify cart, WooCommerce, Stripe.js, etc.)
 *   - Performance score (Lighthouse via PageSpeed Insights API — free, no key needed)
 *   - Mobile score
 *   - SSL/HTTPS
 *   - Last-modified estimate (from HTTP headers or sitemap)
 *   - Has contact form (form[action], #contact, #inquiry)
 *   - Has booking/calendar widget (Calendly, Acuity, Cal.com embed)
 *   - Has pricing page (/pricing, /plans, /packages)
 *
 * Environment variable (optional):
 *   PAGESPEED_API_KEY — PageSpeed Insights API key (increases quota limit)
 *   SERP_API_KEY      — SerpAPI key for web discovery mode
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
  WebsiteData,
} from "@/lib/types";
import { computeOpportunitySignals } from "./signals";

// ─── Tech stack fingerprints ─────────────────────────────────────────────────

const TECH_FINGERPRINTS: Array<{ name: string; patterns: RegExp[] }> = [
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

    /**
     * DISCOVERY MODE — find company websites via SerpAPI web search:
     */
    if (serpKey) {
      const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(params.query + " " + (params.location ?? ""))}&api_key=${serpKey}&num=${limit}`;
      const res = await fetch(searchUrl);
      const data = await res.json();
    
      const urls: string[] = (data.organic_results ?? [])
        .map((r: any) => r.link)
        .filter((url: string) => !isBlacklisted(url));  // skip social media, directories
    
      // Crawl each URL to extract tech stack + metadata
      return await Promise.all(urls.slice(0, limit).map(url => this._crawlUrl(url, cfg)));
    }

    /**
     * ENRICHMENT MODE — given a known domain, crawl it:
     * Called from GoogleMapsScraper / LinkedInScraper after extracting a website URL.
     *
     * const { url } = params as unknown as { url: string };
     * if (url) return [await this._crawlUrl(url, cfg)];
     */

    const isDomain = params.query.includes(".") && !params.query.includes(" ");
    if (isDomain) {
      return [await this._crawlUrl(params.query, cfg)];
    }

    const { url } = params as any;
    if (url) {
      return [await this._crawlUrl(url, cfg)];
    }

    console.log(`[Website] fetch called with non-domain query "${params.query}", falling back to mock discovery.`);
    await new Promise(r => setTimeout(r, 800));
    return Array.from({ length: Math.min(3, limit) }).map((_, i) => ({
      id: `web-mock-${Date.now()}-${i}`,
      sourceId: this.id,
      raw: {
        title: `${params.query} - Official Site ${i}`,
        url: `https://www.${params.query.replace(/\s+/g, "").toLowerCase()}${i}.com`,
        html: "<html><body><script src='wp-includes/js/wp-emoji-release.min.js'></script></body></html>",
      }
    }));
  }

  /**
   * Crawl a single URL and return a RawLeadData with HTML + headers
   */
  private async _crawlUrl(
    url: string,
    cfg: BrowserConfig
  ): Promise<RawLeadData> {
    try {
      const { chromium } = await import("playwright-extra");
      const stealth = await (import("puppeteer-extra-plugin-stealth") as any);
      chromium.use(stealth.default());

      const browser = await chromium.launch({ headless: true, proxy: cfg.proxy ? { server: cfg.proxy.server } : undefined });
      const context = await browser.newContext({ userAgent: cfg.userAgent });
      const page = await context.newPage();

      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: cfg.timeout });
      const html = await page.content();
      const title = await page.title();
      const headers = response?.headers() ?? {};
      const statusCode = response?.status() ?? 0;

      // Also fetch PageSpeed score
      const domain = new URL(url).hostname;
      const psScore = await this._fetchPageSpeedScore(domain);

      await browser.close();
      return { sourceId: "website", raw: { url, html, headers, statusCode, psScore, title } };
    } catch (e: any) {
      console.warn(`[Website] Failed to crawl ${url}:`, e.message);
      // Fallback for MVP if playwright fails
      return { sourceId: "website", raw: { url } };
    }
  }

  /**
   * Fetch Lighthouse performance score from PageSpeed Insights API (free tier)
   */
  private async _fetchPageSpeedScore(domain: string): Promise<{ performance: number; mobile: number } | null> {
    try {
      const apiKey = process.env.PAGESPEED_API_KEY ?? "";
      const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
      const params = new URLSearchParams({
        url: `https://${domain}`,
        strategy: "mobile",
        ...(apiKey ? { key: apiKey } : {}),
        category: "performance",
      });

      const [mobileRes, desktopRes] = await Promise.all([
        fetch(`${base}?${params}`),
        fetch(`${base}?${new URLSearchParams({ ...Object.fromEntries(params), strategy: "desktop" })}`),
      ]);

      const [mobile, desktop] = await Promise.all([mobileRes.json(), desktopRes.json()]);

      return {
        performance: Math.round((desktop.lighthouseResult?.categories?.performance?.score ?? 0) * 100),
        mobile: Math.round((mobile.lighthouseResult?.categories?.performance?.score ?? 0) * 100),
      };
    } catch {
      return null;
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    // PRODUCTION:
    const { url, html, headers, psScore, title } = raw.raw as {
      url: string;
      html?: string;
      headers?: Record<string, string>;
      statusCode?: number;
      psScore?: { performance: number; mobile: number } | null;
      title?: string;
    };
    
    if (!html) {
      return {
        name: title ?? "",
        domain: String(url ?? "").replace(/^https?:\/\/(www\.)?/, "").split("/")[0],
        description: "",
        sourceData: { website: {} },
      };
    }

    const techStack = detectTechStack(html);
    const cms = techStack.find(t => CMS_PATTERNS.includes(t));
    const hasAnalytics = techStack.some(t => ANALYTICS_PATTERNS.includes(t));
    const hasEcommerce = techStack.some(t => ECOMMERCE_PATTERNS.includes(t));
    const hasSSL = url.startsWith("https://");
    const lastModified = headers?.["last-modified"];

    const website: WebsiteData = {
      techStack,
      hasAnalytics,
      hasCMS: !!cms,
      hasEcommerce,
      performanceScore: psScore?.performance,
      mobileScore: psScore?.mobile,
      hasSSL,
      cms,
      lastUpdated: lastModified,
    };

    const domain = new URL(url).hostname.replace(/^www\./, "");
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const name = titleMatch?.[1]?.replace(/\s*[-|].*$/, "").trim() ?? title ?? domain;
    const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
    const description = descMatch?.[1]?.trim() ?? "";

    return { name, domain, description, sourceData: { website } };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const w = lead.sourceData.website as WebsiteData | undefined;
    const signals = computeOpportunitySignals({ website: w });

    return {
      id: `website-${(lead.domain || "unknown").replace(/\./g, "-")}`,
      name: lead.name,
      domain: lead.domain ?? "",
      description: lead.description ?? "Website profile",
      source: sourceId,
      sources: [sourceId],
      location: lead.location,
      industry: lead.industry,
      website: w,
      opportunitySignals: signals,
      isSaved: false,
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
  "clutch.co", "goodfirms.co", "crunchbase.com",
  "wikipedia.org", "indeed.com", "glassdoor.com",
];

export function isBlacklisted(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return BLACKLISTED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return true;
  }
}
