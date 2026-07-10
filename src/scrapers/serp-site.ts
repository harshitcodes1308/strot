import {
  LeadSourceScraper,
  BrowserConfig,
  DEFAULT_BROWSER_CONFIG,
  withRetry,
  computeCompleteness,
} from "./base";
import {
  LeadSource,
  SearchResult,
  ScraperParams,
  RawLeadData,
  NormalizedLead,
} from "@/lib/types";
import crypto from "crypto";

export class SerpSiteScraper implements LeadSourceScraper {
  public id: LeadSource;
  public label: string;
  public selectors = {};
  private siteQuery: string;

  constructor(id: LeadSource, label: string, siteQuery: string) {
    this.id = id;
    this.label = label;
    this.siteQuery = siteQuery; // e.g. "site:clutch.co/profile"
  }

  async fetch(
    params: ScraperParams,
    config?: Partial<BrowserConfig>
  ): Promise<RawLeadData[]> {
    const cfg = { ...DEFAULT_BROWSER_CONFIG, ...config };
    const limit = params.limit ?? 5;
    const serpKey = process.env.SERP_API_KEY;

    if (!serpKey) {
      console.warn(`[${this.label}Scraper] SERP_API_KEY not set. Returning empty.`);
      return [];
    }

    return withRetry(async () => {
      const query = `${this.siteQuery} "${params.query}" ${params.location || ""}`.trim();
      const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpKey}&num=${limit}`;
      
      try {
        const res = await fetch(searchUrl);
        if (!res.ok) {
          throw new Error(`[${this.label}Scraper] API error: ${res.status}`);
        }
        const data = await res.json();
        
        const results = data.organic_results ?? [];
        return results.map((r: any) => ({
          sourceId: this.id,
          raw: r
        }));
      } catch (e) {
        console.error(`[${this.label}Scraper] Error fetching:`, e);
        throw e;
      }
    }, cfg.retries, cfg.retryDelayMs);
  }

  parse(raw: RawLeadData): NormalizedLead {
    const data = raw.raw as any;
    
    // Extract real company name from title
    let title = data.title || "Unknown Company";
    // Strip common suffixes
    title = title.split(" | ")[0].split(" - ")[0].trim();
    
    let domain = null;
    if (data.snippet) {
      const urlMatch = data.snippet.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
      // Ensure we don't capture the directory site itself as the domain
      if (urlMatch && !this.siteQuery.includes(urlMatch[1])) {
        domain = urlMatch[1];
      }
    }

    return {
      name: title,
      domain,
      description: data.snippet,
      industry: "Business",
      sourceData: {
        serp: {
          url: data.link,
          title: data.title,
          snippet: data.snippet,
        }
      }
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const serp = lead.sourceData.serp as any;
    const url = serp?.url || "";
    
    const result: Partial<SearchResult> = {
      id: crypto.createHash("md5").update(`${this.id}-${url}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? `${this.label} company profile`,
      avatar: lead.domain ? `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128` : null,
      source: sourceId,
      sourceUrl: url,
      profileUrl: url,
      socialProfiles: {
        [this.id]: url,
      },
      sources: [sourceId],
      emails: [], 
      phones: [], 
      location: lead.location ?? null,
      industry: lead.industry ?? null,
      employeeCount: null,
      foundedYear: null,
      followers: null,
      engagement: null, 
      rating: null,
      reviewCount: null,
      techStack: [],
      hasWebsite: !!lead.domain,
      isRunningAds: false,
      opportunitySignals: [],
      isSaved: false,
      photos: [],
      painPoints: [],
    };
    
    (result as SearchResult).dataCompleteness = computeCompleteness(result as SearchResult);

    return result as SearchResult;
  }
}
