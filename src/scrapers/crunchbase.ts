/**
 * Crunchbase Scraper — Phase 5 STUB
 *
 * STATUS: manual/beta — requires official API key
 *
 * DECISION: Crunchbase aggressively blocks headless browsers and datacenter IPs.
 * Their official API requires an approved key (apply at https://data.crunchbase.com/docs).
 * Set CRUNCHBASE_API_KEY in .env to enable.
 */

import { LeadSourceScraper, BrowserConfig, computeCompleteness } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

export class CrunchbaseScraper implements LeadSourceScraper {
  readonly id: LeadSource = "crunchbase";
  readonly label = "Crunchbase";
  readonly selectors = {};

  async fetch(params: ScraperParams, _config?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    const apiKey = process.env.CRUNCHBASE_API_KEY;
    if (!apiKey) {
      console.info("[CrunchbaseScraper] CRUNCHBASE_API_KEY not set — source is manual/beta.");
      return [];
    }

    try {
      const res = await fetch(
        `https://api.crunchbase.com/api/v4/searches/organizations?user_key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field_ids: ["identifier", "short_description", "website_url", "location_identifiers"],
            query: [],
            limit: 10,
          }),
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.entities ?? []).map((e: unknown) => ({ sourceId: this.id, raw: e as Record<string, unknown> }));
    } catch (error) {
      console.error("[CrunchbaseScraper] Error:", error);
      return [];
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const e = raw.raw as Record<string, unknown>;
    const props = (e.properties ?? {}) as Record<string, unknown>;
    const websiteUrl = props.website_url as string | undefined;
    const domain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, "").split("/")[0] : undefined;
    return {
      name: (props.identifier as { value: string })?.value ?? "Unknown",
      description: props.short_description as string | undefined,
      domain,
      sources: [this.id],
      opportunitySignals: ["Crunchbase listed — venture-backed or notable company"],
      sourceData: { crunchbase: props },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const props = lead.sourceData.crunchbase as any;
    const identifier = props?.identifier?.permalink || "";
    const url = identifier ? `https://www.crunchbase.com/organization/${identifier}` : "";
    
    const result: Partial<SearchResult> = {
      id: crypto.createHash("md5").update(`cb-${lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "Crunchbase listing",
      avatar: lead.domain ? `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128` : null,
      source: sourceId,
      sourceUrl: url,
      profileUrl: url,
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
      opportunitySignals: lead.opportunitySignals ?? [],
      isSaved: false,
    };
    
    (result as SearchResult).dataCompleteness = computeCompleteness(result as SearchResult);
    return result as SearchResult;
  }
}
