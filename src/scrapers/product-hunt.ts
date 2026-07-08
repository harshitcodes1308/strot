/**
 * Product Hunt Scraper — Phase 5
 * Uses the Product Hunt GraphQL API.
 *
 * Requires PRODUCT_HUNT_TOKEN env var. Gracefully skips if not set.
 * Get a token at: https://www.producthunt.com/v2/oauth/applications
 */

import { LeadSourceScraper, BrowserConfig, computeCompleteness } from "./base";
import { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

const PH_API_URL = "https://api.producthunt.com/v2/api/graphql";

export class ProductHuntScraper implements LeadSourceScraper {
  readonly id: LeadSource = "product_hunt";
  readonly label = "Product Hunt";
  readonly selectors = {};

  async fetch(params: ScraperParams, _config?: Partial<BrowserConfig>): Promise<RawLeadData[]> {
    const token = process.env.PRODUCT_HUNT_TOKEN;
    if (!token) {
      console.info("[ProductHuntScraper] PRODUCT_HUNT_TOKEN not set — source skipped.");
      return [];
    }

    const query = `
      query SearchPosts($query: String!) {
        posts(first: 10, query: $query, order: VOTES) {
          edges {
            node {
              id name tagline description website slug
              topics(first: 3) { edges { node { name } } }
            }
          }
        }
      }
    `;

    try {
      const res = await fetch(PH_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables: { query: params.query } }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const posts = data.data?.posts?.edges?.map((e: { node: unknown }) => e.node) ?? [];
      return posts.map((post: unknown) => ({ sourceId: this.id, raw: post as Record<string, unknown> }));
    } catch (error) {
      console.error("[ProductHuntScraper] Error:", error);
      return [];
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const post = raw.raw as Record<string, unknown>;
    const website = post.website as string | undefined;
    const domain = website ? website.replace(/^https?:\/\//, "").split("/")[0] : undefined;
    const topics = (post.topics as { edges: Array<{ node: { name: string } }> } | undefined)?.edges ?? [];
    const industry = topics[0]?.node?.name ?? "Technology";

    return {
      name: post.name as string,
      domain,
      description: post.tagline as string ?? undefined,
      industry,
      sources: [this.id],
      opportunitySignals: ["Recently launched on Product Hunt — potential early-stage growth opportunity"],
      sourceData: { product_hunt: post },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const post = lead.sourceData.product_hunt as any;
    const slug = post?.slug || "";
    const url = slug ? `https://www.producthunt.com/posts/${slug}` : "";
    const websiteUrl = post?.website || null;

    const result: Partial<SearchResult> = {
      id: crypto.createHash("md5").update(`ph-${lead.name}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "Product Hunt launch",
      avatar: lead.domain ? `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128` : null,
      source: sourceId,
      sourceUrl: url,
      profileUrl: websiteUrl || url,
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
