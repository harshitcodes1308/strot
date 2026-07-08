/**
 * Behance Scraper — Phase 5 STUB
 * STATUS: manual/beta — Adobe auth required. Official API deprecated.
 * WORKAROUND: Use the Strot Chrome Extension while logged into Behance.
 */
import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";

export class BehanceScraper implements LeadSourceScraper {
  readonly id: LeadSource = "behance";
  readonly label = "Behance";
  readonly selectors = {};
  async fetch(_p: ScraperParams, _c?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    console.info("[BehanceScraper] manual/beta — Adobe auth required.");
    return [];
  }
  parse(_r: RawLeadData): NormalizedLead { return { name: "Unknown", sourceData: {} }; }
  normalize(_l: NormalizedLead, s: LeadSource): SearchResult {
    return { id: "", name: "", domain: "", description: "", source: s, sources: [s], opportunitySignals: [], isSaved: false };
  }
}
