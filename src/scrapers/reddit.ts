/**
 * Reddit Scraper — Phase 5
 * Uses Reddit's public JSON API (no key needed) to search subreddits for business niches.
 * Strong for surfacing industry communities that signal high-density prospecting areas.
 */

import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

export class RedditScraper implements LeadSourceScraper {
  readonly id: LeadSource = "reddit";
  readonly label = "Reddit";
  readonly selectors = {};

  async fetch(params: ScraperParams, _config?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    const query = encodeURIComponent(params.query);
    const url = `https://www.reddit.com/search.json?q=${query}&type=sr&limit=10`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Strot-LeadDiscovery/1.0" },
      });

      if (!res.ok) {
        console.warn(`[RedditScraper] API returned ${res.status}`);
        return [];
      }

      const data = await res.json();
      const subreddits: unknown[] = data.data?.children ?? [];

      return subreddits
        .filter((sr: unknown) => {
          const item = sr as { data: { subscribers: number } };
          return item.data.subscribers > 500;
        })
        .slice(0, 5)
        .map((sr: unknown) => ({ sourceId: this.id, raw: (sr as { data: unknown }).data as Record<string, unknown> }));
    } catch (error) {
      console.error("[RedditScraper] Error:", error);
      return [];
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const sr = raw.raw as Record<string, unknown>;
    return {
      name: (sr.title as string) || (sr.display_name as string) || "Unknown Subreddit",
      description: sr.public_description as string ?? undefined,
      industry: "Community / Media",
      sources: [this.id],
      opportunitySignals: [
        `r/${sr.display_name} has ${(sr.subscribers as number)?.toLocaleString() ?? "?"} members`,
      ],
      sourceData: { reddit: sr },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const sr = lead.sourceData["reddit"] as Record<string, unknown> | undefined;
    return {
      id: crypto.createHash("md5").update(`reddit-${sr?.id ?? lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? "",
      description: lead.description ?? "Reddit community",
      source: sourceId,
      sources: [sourceId],
      industry: lead.industry,
      opportunitySignals: computeOpportunitySignals(lead as any),
      isSaved: false,
    };
  }
}
