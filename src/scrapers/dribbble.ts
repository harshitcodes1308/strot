/**
 * Dribbble Scraper — Phase 5 STUB
 * STATUS: manual/beta — OAuth required; team search needs enterprise plan.
 * Set DRIBBBLE_ACCESS_TOKEN in .env when available.
 * Register app at: https://dribbble.com/account/applications
 */
import crypto from "crypto";
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
  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    return {
      id: crypto.createHash("md5").update(`dribbble-${lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "Dribbble profile",
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
