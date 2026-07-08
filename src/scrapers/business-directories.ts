import type { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";
import { LeadSourceScraper } from "./base";
import { computeOpportunitySignals } from "./signals";

export class BusinessDirectoriesScraper implements LeadSourceScraper {
  readonly id: LeadSource = "website"; // Actually this should be a new source
  readonly label = "Business Directories";
  readonly selectors = {};

  async fetch(params: ScraperParams): Promise<RawLeadData[]> {
    console.log(`[Business Directories] Searching for: ${params.query}`);
    return []; // TODO: Implement real directory scraping
  }

  parse(raw: RawLeadData): NormalizedLead {
    const data = (raw.raw?.directory as any) || {};
    return {
      id: `dir-${Date.now()}`,
      name: data.name || "Unknown Business",
      domain: data.website ? new URL(data.website).hostname : null,
      description: data.description || "Found via Business Directory",
      location: data.location || null,
      industry: data.industry || null,
      sourceData: raw.raw || {},
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const url = lead.sourceData?.directory?.url || "";
    return {
      id: lead.id ?? crypto.randomUUID(),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? null,
      avatar: null,
      source: sourceId,
      sources: [sourceId],
      sourceUrl: url,
      profileUrl: url,
      socialProfiles: {},
      emails: lead.sourceData?.directory?.emails || [],
      phones: lead.sourceData?.directory?.phones || [],
      location: lead.location ?? null,
      industry: lead.industry ?? null,
      employeeCount: null,
      foundedYear: null,
      followers: null,
      engagement: null,
      rating: lead.sourceData?.directory?.rating ?? null,
      reviewCount: lead.sourceData?.directory?.reviews ?? null,
      techStack: [],
      hasWebsite: !!lead.domain,
      isRunningAds: false,
      isSaved: false,
      opportunitySignals: [],
      dataCompleteness: 0,
    };
  }
}

export const businessDirectoriesScraper = new BusinessDirectoriesScraper();
