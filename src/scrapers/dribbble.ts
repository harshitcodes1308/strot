/**
 * Dribbble Scraper — Phase 5 STUB
 * STATUS: manual/beta — OAuth required; team search needs enterprise plan.
 * Set DRIBBBLE_ACCESS_TOKEN in .env when available.
 * Register app at: https://dribbble.com/account/applications
 */
import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";

export class DribbbleScraper implements LeadSourceScraper {
  readonly id: LeadSource = "dribbble";
  readonly label = "Dribbble";
  readonly selectors = {};
  async fetch(_p: ScraperParams, _c?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    const token = process.env.DRIBBBLE_ACCESS_TOKEN;
    if (!token) { console.info("[DribbbleScraper] manual/beta — DRIBBBLE_ACCESS_TOKEN not set."); return []; }
    console.info("[DribbbleScraper] Token present but team search requires enterprise plan.");
    return [];
  }
  parse(_r: RawLeadData): NormalizedLead { return { name: "Unknown", sourceData: {} }; }
  normalize(_l: NormalizedLead, s: LeadSource): SearchResult {
    return { id: "", name: "", domain: "", description: "", source: s, sources: [s], opportunitySignals: [], isSaved: false };
  }
}
