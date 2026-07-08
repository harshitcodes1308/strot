/**
 * GoodFirms Scraper — Phase 5 STUB
 * STATUS: manual/beta — Cloudflare bot protection active. No public API.
 * WORKAROUND: Use the Strot Chrome Extension while browsing GoodFirms.
 */
import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";

export class GoodFirmsScraper implements LeadSourceScraper {
  readonly id: LeadSource = "goodfirms" as LeadSource; // Will cast until we verify it's in types
  readonly label = "GoodFirms";
  readonly selectors = {};
  async fetch(_p: ScraperParams, _c?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    console.info("[GoodFirmsScraper] manual/beta — Cloudflare blocks all automated access.");
    return [];
  }
  parse(_r: RawLeadData): NormalizedLead { return { name: "Unknown", sourceData: {} }; }
  normalize(_l: NormalizedLead, s: LeadSource): SearchResult {
    return { id: "", name: "", domain: "", description: "", source: s, sources: [s], opportunitySignals: [], isSaved: false };
  }
}
