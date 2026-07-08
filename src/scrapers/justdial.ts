/**
 * JustDial Scraper — Phase 5 STUB
 * STATUS: manual/beta — Indian phone OTP auth required. No public API.
 */
import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";

export class JustDialScraper implements LeadSourceScraper {
  readonly id: LeadSource = "justdial";
  readonly label = "JustDial";
  readonly selectors = {};
  async fetch(_p: ScraperParams, _c?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    console.info("[JustDialScraper] manual/beta — Indian phone OTP auth required.");
    return [];
  }
  parse(_r: RawLeadData): NormalizedLead { return { name: "Unknown", sourceData: {} }; }
  normalize(_l: NormalizedLead, s: LeadSource): SearchResult {
    return { id: "", name: "", domain: "", description: "", source: s, sources: [s], opportunitySignals: [], isSaved: false };
  }
}
