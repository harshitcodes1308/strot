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

export class SerpDiscoveryScraper implements LeadSourceScraper {
  readonly id: LeadSource = "serp";
  readonly label = "Web Search";
  readonly selectors = {};

  async fetch(
    params: ScraperParams,
    config?: Partial<BrowserConfig>
  ): Promise<RawLeadData[]> {
    const cfg = { ...DEFAULT_BROWSER_CONFIG, ...config };
    const limit = params.limit ?? 10;
    const serpKey = process.env.SERP_API_KEY;

    if (!serpKey) {
      console.warn("[SerpDiscoveryScraper] SERP_API_KEY not set. Returning empty.");
      return [];
    }

    return withRetry(async () => {
      // Broad generic search for the query, not restricted to any site.
      const query = `${params.query} ${params.location || ""}`.trim();
      const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpKey}&num=${limit}`;
      
      try {
        const res = await fetch(searchUrl);
        if (!res.ok) {
          throw new Error(`[SerpDiscoveryScraper] API error: ${res.status}`);
        }
        const data = await res.json();
        
        const results = data.organic_results ?? [];
        return results.map((r: any) => ({
          sourceId: this.id,
          raw: r
        }));
      } catch (e) {
        console.error("[SerpDiscoveryScraper] Error fetching:", e);
        throw e;
      }
    }, cfg.retries, cfg.retryDelayMs);
  }

  parse(raw: RawLeadData): NormalizedLead {
    const data = raw.raw as any;
    
    let domain = null;
    if (data.link) {
      try {
        const urlObj = new URL(data.link);
        domain = urlObj.hostname.replace(/^www\./, "");
      } catch (e) {
        // ignore invalid URL
      }
    }

    const title = data.title || "Unknown Lead";
    // Many results might be directories or irrelevant, but we capture them anyway.
    
    return {
      name: title,
      domain,
      description: data.snippet || "",
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
    const serpData = lead.sourceData.serp as any;
    const url = serpData?.url || "";
    
    const result: Partial<SearchResult> = {
      id: crypto.createHash("md5").update(`serp-${url}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "Discovered via Web Search",
      avatar: lead.domain ? `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128` : null,
      source: sourceId,
      sourceUrl: url,
      profileUrl: url,
      socialProfiles: {},
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
