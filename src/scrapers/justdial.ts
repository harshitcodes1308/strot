/**
 * JustDial Scraper — Phase 5 STUB
 * STATUS: manual/beta — Indian phone OTP auth required. No public API.
 */
import crypto from "crypto";
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
  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    return {
      id: crypto.createHash("md5").update(`justdial-${lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "JustDial listing",
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
