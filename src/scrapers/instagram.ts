/**
 * Instagram Scraper — Phase 1
 *
 * Scrapes public Instagram business/creator profiles via:
 *   a) Instagram's public JSON API endpoint (?__a=1&__d=dis) — no auth required for public profiles
 *   b) Playwright fallback for profiles that block the JSON endpoint
 *
 * What we extract:
 *   - Username (handle), bio
 *   - Follower count, following count, post count
 *   - Average likes per post (sampled from last 12 posts)
 *   - Engagement rate = avg_likes / followers
 *   - Last posted date
 *   - Business category (when available)
 *   - External URL (→ website domain)
 *
 * Search approach:
 *   Instagram has no public keyword search API. We search via:
 *     1. Instagram hashtag pages (#coffeeshop, #brandingagency) to find accounts
 *     2. Instagram's internal user-search endpoint (account-based) for known handles
 *     3. Cross-referencing accounts found via Google Maps or LinkedIn data
 *   This is why Instagram works BEST as a secondary enrichment source (not primary).
 *
 * Rate limiting: Instagram aggressively rate limits. Max 10 profile requests/session.
 * Use session rotation and residential proxies in production.
 *
 * DECISION: Instagram is a secondary/enrichment source for Phase 1. Primary discovery
 * is via Google Maps and LinkedIn; Instagram data enriches those results and enables
 * standalone discovery via hashtag search.
 */

import {
  LeadSourceScraper,
  BrowserConfig,
  DEFAULT_BROWSER_CONFIG,
} from "./base";
import {
  LeadSource,
  SearchResult,
  ScraperParams,
  RawLeadData,
  NormalizedLead,
  InstagramData,
} from "@/lib/types";
import { computeOpportunitySignals } from "./signals";

// ─── Selectors ────────────────────────────────────────────────────────────────

const INSTAGRAM_SELECTORS = {
  // Hashtag search page
  hashtagPostGrid:  "article div._aagw",
  postLink:         "a[href*='/p/']",
  // Profile page fallbacks (Playwright)
  username:         "h2._aacl",
  bio:              "div._aacl._aacs._aact._aacx._aada",
  stats:            "ul._aa_8 li span._ac2a",
  externalUrl:      "a[rel='nofollow']",
};

// ─── Instagram JSON endpoint ──────────────────────────────────────────────────
// Public profile data available at:
// https://www.instagram.com/{username}/?__a=1&__d=dis
// Returns GraphQL JSON with edge_followed_by, edge_follow, biography, external_url, etc.
// Note: This endpoint may require a valid session cookie in 2024+ — test per account.

const IG_JSON_URL = (handle: string) =>
  `https://www.instagram.com/${handle.replace(/^@/, "")}/?__a=1&__d=dis`;

// ─── Instagram Scraper ────────────────────────────────────────────────────────

export class InstagramScraper implements LeadSourceScraper {
  readonly id: LeadSource = "instagram";
  readonly label = "Instagram";
  readonly selectors = INSTAGRAM_SELECTORS;

  async fetch(
    params: ScraperParams,
    config?: Partial<BrowserConfig>
  ): Promise<RawLeadData[]> {
    const cfg = { ...DEFAULT_BROWSER_CONFIG, ...config };
    const limit = params.limit ?? 15;

    /**
     * PRODUCTION IMPLEMENTATION:
     *
     * Strategy: search Instagram via hashtags derived from the query
     *
     * const hashtags = queryToHashtags(params.query, params.industry);
     * // e.g. "coffee shop portland" → ["#coffeeshop", "#portlandcoffee", "#specialtycoffee"]
     *
     * const { chromium } = await import("playwright-extra");
     * const stealth = await import("puppeteer-extra-plugin-stealth");
     * chromium.use(stealth.default());
     *
     * const browser = await chromium.launch({
     *   headless: cfg.headless,
     *   proxy: cfg.proxy ? { server: cfg.proxy.server, ... } : undefined,
     * });
     * const context = await browser.newContext({
     *   userAgent: cfg.userAgent,
     *   storageState: process.env.INSTAGRAM_SESSION_PATH,
     * });
     *
     * const rawItems: RawLeadData[] = [];
     *
     * for (const tag of hashtags) {
     *   if (rawItems.length >= limit) break;
     *   const page = await context.newPage();
     *   await page.goto(`https://www.instagram.com/explore/tags/${tag.replace("#","")}/`, { waitUntil: "networkidle" });
     *
     *   // Collect post links → extract author handles → fetch each profile
     *   const postLinks = await page.$$eval(INSTAGRAM_SELECTORS.postLink, els => els.map(e => e.getAttribute("href")));
     *   const handles = await resolveHandlesFromPosts(context, postLinks.slice(0, limit));
     *
     *   // Fetch profile JSON for each handle
     *   for (const handle of handles) {
     *     if (rawItems.length >= limit) break;
     *     try {
     *       const res = await page.goto(IG_JSON_URL(handle), { timeout: 10_000 });
     *       const json = await res?.json();
     *       if (json?.graphql?.user) {
     *         rawItems.push({ sourceId: "instagram", raw: { handle, profile: json.graphql.user } });
     *       }
     *     } catch {
     *       // Fall back to DOM scraping on the profile page
     *       const profile = await scrapeProfileDOM(context, handle, cfg);
     *       if (profile) rawItems.push({ sourceId: "instagram", raw: profile });
     *     }
     *     await page.waitForTimeout(cfg.rateLimit.jitterMs + Math.random() * 2000);
     *   }
     *   await page.close();
     * }
     *
     * await browser.close();
     * return rawItems;
     */

    console.log(`[Instagram] fetch called: query="${params.query}" location="${params.location ?? ""}"`);
    return [];
  }

  parse(raw: RawLeadData): NormalizedLead {
    /**
     * PRODUCTION:
     * const { handle, profile } = raw.raw as {
     *   handle: string;
     *   profile: {
     *     username: string;
     *     full_name: string;
     *     biography: string;
     *     external_url: string;
     *     edge_followed_by: { count: number };
     *     edge_follow: { count: number };
     *     edge_owner_to_timeline_media: {
     *       count: number;
     *       edges: { node: { edge_liked_by: { count: number }; taken_at_timestamp: number } }[];
     *     };
     *     business_category_name?: string;
     *   };
     * };
     *
     * const posts = profile.edge_owner_to_timeline_media.edges.slice(0, 12);
     * const avgLikes = posts.length
     *   ? Math.round(posts.reduce((s, p) => s + p.node.edge_liked_by.count, 0) / posts.length)
     *   : 0;
     * const followers = profile.edge_followed_by.count;
     * const engagementRate = followers ? parseFloat(((avgLikes / followers) * 100).toFixed(1)) : 0;
     *
     * const lastPostTs = posts[0]?.node.taken_at_timestamp;
     * const lastPosted = lastPostTs ? new Date(lastPostTs * 1000).toISOString().split("T")[0] : undefined;
     *
     * const domain = profile.external_url
     *   ? profile.external_url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
     *   : `${profile.username}.com`;  // fallback
     *
     * const ig: InstagramData = {
     *   handle: `@${profile.username}`,
     *   followers,
     *   following: profile.edge_follow.count,
     *   posts: profile.edge_owner_to_timeline_media.count,
     *   avgLikes,
     *   engagementRate,
     *   lastPosted,
     *   bio: profile.biography,
     * };
     *
     * return {
     *   name: profile.full_name || profile.username,
     *   domain,
     *   description: profile.biography,
     *   industry: profile.business_category_name,
     *   sourceData: { instagram: ig },
     * };
     */

    const { handle } = raw.raw as { handle: string };
    return {
      name: handle,
      domain: `${handle.replace(/^@/, "")}.com`,
      description: "",
      sourceData: { instagram: { handle } },
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const ig = lead.sourceData.instagram as InstagramData | undefined;
    const signals = computeOpportunitySignals({ instagram: ig });

    return {
      id: `instagram-${ig?.handle?.replace(/^@/, "") ?? lead.name}`,
      name: lead.name,
      domain: lead.domain,
      description: lead.description,
      source: sourceId,
      sources: [sourceId],
      location: lead.location,
      industry: lead.industry,
      instagram: ig,
      opportunitySignals: signals,
      isSaved: false,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a search query into Instagram hashtags.
 * "coffee shop portland" → ["coffeeshop", "portlandcoffee", "specialtycoffee"]
 */
export function queryToHashtags(query: string, industry?: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const combined = words.join("");
  const reversed = [...words].reverse().join("");
  const tags = [combined, reversed];
  if (industry) tags.push(industry.toLowerCase().replace(/\s+/g, ""));
  // Add common niche hashtags
  if (query.toLowerCase().includes("coffee")) tags.push("specialtycoffee", "thirdwavecoffee");
  if (query.toLowerCase().includes("agency")) tags.push("designagency", "brandingagency");
  if (query.toLowerCase().includes("interior")) tags.push("interiordesign", "interiordesigner");
  return [...new Set(tags)].slice(0, 5);
}
