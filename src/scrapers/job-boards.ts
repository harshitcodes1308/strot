/**
 * Job Boards Scraper — Phase 5
 * Searches Hacker News "Who's Hiring" via Algolia HN Search API (public, no auth).
 * Hiring activity = strong buying signal for digital services.
 */

import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

export class JobBoardsScraper implements LeadSourceScraper {
  readonly id: LeadSource = "job_boards";
  readonly label = "Job Boards";
  readonly selectors = {};

  async fetch(params: ScraperParams, _config?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    const query = encodeURIComponent(params.query);
    const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=ask_hn,job&hitsPerPage=15`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Strot-LeadDiscovery/1.0" },
      });

      if (!res.ok) {
        console.warn(`[JobBoardsScraper] HN Algolia API returned ${res.status}`);
        return [];
      }

      const data = await res.json();
      const hits: unknown[] = data.hits ?? [];

      const results: RawLeadData[] = [];
      const seenCompanies = new Set<string>();

      for (const hit of hits) {
        const item = hit as Record<string, unknown>;
        const firstLine = ((item.text as string) ?? "").split(/\n|<p>/)[0];
        const parts = firstLine.split("|").map((p: string) => p.trim().replace(/<[^>]+>/g, ""));
        const companyName = parts[0]?.substring(0, 80);
        if (!companyName || companyName.length < 2 || seenCompanies.has(companyName)) continue;
        seenCompanies.add(companyName);

        const location = parts.find((p: string) =>
          /remote|san francisco|new york|london|berlin|bangalore|india/i.test(p)
        );

        results.push({
          sourceId: this.id,
          raw: { ...item, parsedName: companyName, parsedLocation: location, firstLine },
        });

        if (results.length >= 5) break;
      }

      return results;
    } catch (error) {
      console.error("[JobBoardsScraper] Error:", error);
      return [];
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const item = raw.raw as Record<string, unknown>;
    return {
      name: item.parsedName as string,
      location: (item.parsedLocation as string | undefined) ?? undefined,
      description: `Actively hiring — seen on Hacker News "Who's Hiring"`,
      industry: "Technology",
      sources: [this.id],
      opportunitySignals: [
        "Actively hiring on Hacker News — strong growth signal",
        "Engineering-focused team — potential for tech/design outsourcing",
      ],
      sourceData: { job_boards: item },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const item = lead.sourceData["job_boards"] as Record<string, unknown> | undefined;
    return {
      id: crypto.createHash("md5").update(`hn-hiring-${item?.objectID ?? lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? "",
      description: lead.description ?? "Job board listing",
      source: sourceId,
      sources: [sourceId],
      location: lead.location,
      industry: lead.industry,
      opportunitySignals: computeOpportunitySignals(lead as any),
      isSaved: false,
    };
  }
}
