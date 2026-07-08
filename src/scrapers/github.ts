/**
 * GitHub Scraper — Phase 5
 * Uses the official GitHub Search API (no auth needed for basic usage; 60 req/h unauthenticated).
 * With GITHUB_TOKEN: 5,000 req/h.
 *
 * Searches for organisations/users matching the query — surfaces technology companies and OSS teams.
 */

import { LeadSourceScraper, BrowserConfig } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

export class GithubScraper implements LeadSourceScraper {
  readonly id: LeadSource = "github";
  readonly label = "GitHub";
  readonly selectors = {};

  async fetch(params: ScraperParams, _config?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    const query = encodeURIComponent(`${params.query} in:description,name type:org`);
    const url = `https://api.github.com/search/users?q=${query}&per_page=10`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const token = process.env.GITHUB_TOKEN;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`[GithubScraper] API returned ${res.status}`);
        return [];
      }

      const data = await res.json();
      const items: Array<{ login: string; html_url: string }> = data.items ?? [];
      const results: RawLeadData[] = [];

      for (const item of items.slice(0, 5)) {
        try {
          const orgRes = await fetch(`https://api.github.com/orgs/${item.login}`, { headers });
          const org = orgRes.ok ? await orgRes.json() : item;
          results.push({ sourceId: this.id, raw: org });
        } catch {
          results.push({ sourceId: this.id, raw: item });
        }
      }

      return results;
    } catch (error) {
      console.error("[GithubScraper] Error:", error);
      return [];
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const org = raw.raw as Record<string, unknown>;
    const blog = (org.blog as string) ?? "";
    const domain = blog ? blog.replace(/^https?:\/\//, "").split("/")[0] : undefined;

    return {
      name: (org.name as string) || (org.login as string) || "Unknown Org",
      domain,
      description: (org.description as string) ?? undefined,
      location: (org.location as string) ?? undefined,
      industry: "Technology",
      sources: [this.id],
      opportunitySignals: org.public_repos
        ? [`${org.public_repos} public repos — active open source presence`]
        : [],
      sourceData: {
        github: org,
      },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    return {
      id: crypto.createHash("md5").update(`github-${lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? "",
      description: lead.description ?? "GitHub organization",
      source: sourceId,
      sources: [sourceId],
      location: lead.location,
      industry: lead.industry,
      opportunitySignals: computeOpportunitySignals(lead as any),
      isSaved: false,
    };
  }
}
