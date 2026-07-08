/**
 * IndiaMART Scraper — Phase 5 STUB
 * STATUS: manual/beta — requires INDIAMART_API_KEY (apply at https://seller.indiamart.com/api)
 * Set INDIAMART_API_KEY in .env to enable.
 */
import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

export class IndiaMartScraper implements LeadSourceScraper {
  readonly id: LeadSource = "indiamart";
  readonly label = "IndiaMART";
  readonly selectors = {};

  async fetch(params: ScraperParams, _c?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    const apiKey = process.env.INDIAMART_API_KEY;
    if (!apiKey) { console.info("[IndiaMartScraper] manual/beta — INDIAMART_API_KEY not set."); return []; }

    try {
      const res = await fetch(
        `https://dir.indiamart.com/api/v1/getProductList.php?gkey=${apiKey}&query=${encodeURIComponent(params.query)}&cntflds=10`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.RESPONSE ?? []).slice(0, 10).map((item: unknown) => ({ sourceId: this.id, raw: item as Record<string, unknown> }));
    } catch (error) {
      console.error("[IndiaMartScraper] Error:", error);
      return [];
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const item = raw.raw as Record<string, string>;
    return {
      name: item.CNM ?? "Unknown Supplier",
      description: item.PRDNAME,
      location: item.CITY,
      industry: item.CAT ?? "Manufacturing",
      sources: [this.id],
      opportunitySignals: ["IndiaMART B2B supplier — offline-first with digital growth opportunity"],
      sourceData: { indiamart: item },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    return {
      id: crypto.createHash("md5").update(`im-${lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "IndiaMART supplier",
      avatar: null,
      source: sourceId,
      sourceUrl: "",
      profileUrl: null,
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
      dataCompleteness: 0,
    };
  }
}
