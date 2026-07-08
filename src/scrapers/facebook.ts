/**
 * Facebook Scraper — Phase 5 STUB
 * STATUS: manual/beta — Meta blocks all automated access. ToS violation risk.
 * WORKAROUND: Use the Strot Chrome Extension while browsing Facebook Business pages.
 */
import crypto from "crypto";
import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";

export class FacebookScraper implements LeadSourceScraper {
  readonly id: LeadSource = "facebook";
  readonly label = "Facebook";
  readonly selectors = {};
  async fetch(_p: ScraperParams, _c?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    console.info("[FacebookScraper] manual/beta — Meta blocks all automated access. Use Chrome Extension.");
    return [];
  }
  parse(_r: RawLeadData): NormalizedLead { return { name: "Unknown", sourceData: {} }; }
  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    return {
      id: crypto.createHash("md5").update(`facebook-${lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "Facebook page",
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
