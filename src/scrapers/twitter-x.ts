/**
 * Twitter/X Scraper — Phase 5 STUB
 * STATUS: manual/beta — requires paid X API subscription ($100+/month).
 * Set X_BEARER_TOKEN in .env when available.
 * Sign up at: https://developer.x.com
 */
import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

export class TwitterXScraper implements LeadSourceScraper {
  readonly id: LeadSource = "twitter_x";
  readonly label = "Twitter/X";
  readonly selectors = {};

  async fetch(params: ScraperParams, _c?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    const token = process.env.X_BEARER_TOKEN;
    if (!token) { console.info("[TwitterXScraper] manual/beta — X_BEARER_TOKEN not set."); return []; }

    try {
      const query = encodeURIComponent(`${params.query} -is:retweet lang:en`);
      const res = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${query}&expansions=author_id&user.fields=name,description,url,location,public_metrics&max_results=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { console.warn(`[TwitterXScraper] API returned ${res.status}`); return []; }
      const data = await res.json();
      const users: unknown[] = data.includes?.users ?? [];
      return users.slice(0, 5).map((u: unknown) => ({ sourceId: this.id, raw: u as Record<string, unknown> }));
    } catch (error) {
      console.error("[TwitterXScraper] Error:", error);
      return [];
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const user = raw.raw as Record<string, unknown>;
    const metrics = user.public_metrics as Record<string, number> | undefined;
    return {
      name: user.name as string,
      description: user.description as string | undefined,
      location: user.location as string | undefined,
      sources: [this.id],
      opportunitySignals: metrics?.followers_count
        ? [`${metrics.followers_count.toLocaleString()} Twitter/X followers — active social brand`]
        : [],
      sourceData: { twitter_x: user },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const user = lead.sourceData["twitter_x"] as Record<string, unknown> | undefined;
    return {
      id: crypto.createHash("md5").update(`twitter-${user?.id ?? lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? "",
      description: lead.description ?? "Twitter/X profile",
      source: sourceId,
      sources: [sourceId],
      location: lead.location,
      opportunitySignals: computeOpportunitySignals(lead as any),
      isSaved: false,
    };
  }
}
