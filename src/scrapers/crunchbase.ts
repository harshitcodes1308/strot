/**
 * Crunchbase Scraper — Phase 5 STUB
 *
 * STATUS: manual/beta — requires official API key
 *
 * DECISION: Crunchbase aggressively blocks headless browsers and datacenter IPs.
 * Their official API requires an approved key (apply at https://data.crunchbase.com/docs).
 * Set CRUNCHBASE_API_KEY in .env to enable.
 */

import { LeadSourceScraper, BrowserConfig } from "./base";
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
    return {
      name: (props.identifier as { value: string })?.value ?? "Unknown",
      description: props.short_description as string | undefined,
      domain: props.website_url as string | undefined,
      sources: [this.id],
      opportunitySignals: ["Crunchbase listed — venture-backed or notable company"],
      sourceData: { crunchbase: props },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    return {
      id: crypto.createHash("md5").update(`crunchbase-${lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? "",
      description: lead.description ?? "Crunchbase listing",
      source: sourceId,
      sources: [sourceId],
      opportunitySignals: computeOpportunitySignals(lead as any),
      isSaved: false,
    };
  }
}
