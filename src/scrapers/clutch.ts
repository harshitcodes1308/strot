/**
 * Clutch Scraper — Phase 5 STUB
 *
 * STATUS: manual/beta — Cloudflare bot protection active
 *
 * DECISION: Clutch.co employs aggressive Cloudflare + device fingerprinting.
 * All datacenter requests are challenged with CAPTCHA. No official API exists.
 *
 * WORKAROUND: Use the Strot Chrome Extension while browsing Clutch to capture agency
 * profiles from your browser session with one click.
 */

import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";

export class ClutchScraper implements LeadSourceScraper {
  readonly id: LeadSource = "clutch";
  readonly label = "Clutch";
  readonly selectors = {};

  async fetch(_params: ScraperParams, _config?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    console.info("[ClutchScraper] manual/beta — use Chrome Extension to capture Clutch profiles.");
    return [];
  }

  parse(_raw: RawLeadData): NormalizedLead {
    return { name: "Unknown", sourceData: {} };
  }

  normalize(_lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    return { id: "", name: "", domain: "", description: "", source: sourceId, sources: [sourceId], opportunitySignals: [], isSaved: false };
  }
}
