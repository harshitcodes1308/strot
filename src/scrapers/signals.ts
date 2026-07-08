/**
 * Opportunity Signal Detection — Phase 1
 *
 * Given enrichment data from any combination of sources (LinkedIn, Instagram,
 * Google Maps, Website), computes a list of human-readable opportunity signals.
 *
 * These signals are the core value proposition: "here's WHY this lead is worth
 * contacting." They appear as badges on each lead card and in the lead dashboard.
 *
 * Rules are intentionally deterministic for Phase 1. Phase 2 adds an AI layer
 * that reasons across all signals to produce an Opportunity Score + Priority.
 */

import type { LinkedInData, InstagramData, GoogleMapsData, WebsiteData } from "@/lib/types";

export interface SignalInput {
  linkedin?: LinkedInData;
  instagram?: InstagramData;
  google?: GoogleMapsData;
  website?: WebsiteData;
}

/**
 * Returns an array of opportunity signal strings for a given set of enrichment data.
 * Each string is a short, actionable observation (max 60 chars).
 */
export function computeOpportunitySignals(data: SignalInput): string[] {
  const signals: string[] = [];

  // ── LinkedIn signals ──────────────────────────────────────────────────────
  if (data.linkedin) {
    const li = data.linkedin;

    // Active on LinkedIn but no website conversion
    if (li.followers && li.followers > 500 && data.website && !data.website.hasAnalytics) {
      signals.push("LinkedIn active, no website analytics");
    }

    // Low post activity — might need content strategy
    if (li.recentPosts !== undefined && li.recentPosts < 3) {
      signals.push("Low LinkedIn posting activity");
    }

    // Significant following, no e-commerce
    if (li.followers && li.followers > 1000 && data.website && !data.website.hasEcommerce) {
      signals.push("Audience exists, no e-commerce layer");
    }

    // No specialties listed — gaps in brand clarity
    if (!li.specialties || li.specialties.length === 0) {
      signals.push("No specialties listed on LinkedIn");
    }
  }

  // ── Instagram signals ─────────────────────────────────────────────────────
  if (data.instagram) {
    const ig = data.instagram;

    // High engagement but relying on DMs
    if (ig.engagementRate && ig.engagementRate > 0.03 && ig.bio?.toLowerCase().includes("dm")) {
      signals.push("High engagement — DM-only intake, no booking");
    }

    // Significant followers, no storefront
    if (ig.followers && ig.followers > 5000 && data.website && !data.website.hasEcommerce) {
      signals.push(`${formatFollowers(ig.followers)} IG followers, no storefront`);
    }

    // Using Linktree instead of real site
    if (data.website?.techStack?.includes("Linktree") || data.website?.cms === "Linktree") {
      signals.push("Selling via Linktree — no owned storefront");
    }

    // High follower count, low posting frequency — stale content
    if (ig.followers && ig.followers > 2000 && ig.lastPosted) {
      const daysSince = daysBetween(new Date(ig.lastPosted), new Date());
      if (daysSince > 14) {
        signals.push(`${daysSince}d since last Instagram post`);
      }
    }

    // Strong engagement rate above category average
    if (ig.engagementRate && ig.engagementRate > 0.05) {
      signals.push(`${(ig.engagementRate * 100).toFixed(1)}% IG engagement rate — above average`);
    }

    // No website at all despite Instagram presence
    if (!data.website || !data.website.techStack?.length) {
      if (ig.followers && ig.followers > 1000) {
        signals.push("No website — Instagram-native business");
      }
    }
  }

  // ── Google Maps signals ───────────────────────────────────────────────────
  if (data.google) {
    const g = data.google;

    // High rating, high review count — strong local reputation
    if (g.rating >= 4.7 && g.reviewCount >= 100) {
      signals.push(`${g.rating}★ with ${g.reviewCount} reviews — local authority`);
    }

    // Unclaimed listing is a clear gap
    if (g.claimedListing === false) {
      signals.push("Google Business listing unclaimed");
    }

    // Has good Maps presence but weak website
    if (g.reviewCount >= 50 && data.website && (data.website.performanceScore ?? 0) < 50) {
      signals.push(`Maps: ${g.rating}★ but website performance score ${data.website.performanceScore}`);
    }

    // No website linked from Maps listing
    if (!g.website && g.reviewCount > 20) {
      signals.push("No website linked in Google listing");
    }
  }

  // ── Website signals ───────────────────────────────────────────────────────
  if (data.website) {
    const w = data.website;

    // Poor performance score
    if (w.performanceScore !== undefined && w.performanceScore < 50) {
      signals.push(`Website performance score: ${w.performanceScore}/100`);
    }

    // No analytics — flying blind
    if (!w.hasAnalytics) {
      signals.push("No analytics detected on website");
    }

    // Has e-commerce but terrible mobile score
    if (w.hasEcommerce && w.mobileScore !== undefined && w.mobileScore < 50) {
      signals.push(`E-commerce site with ${w.mobileScore} mobile score`);
    }

    // No SSL — rare but still happens with small businesses
    if (w.hasSSL === false) {
      signals.push("No SSL certificate — HTTP only");
    }

    // Running a low-end CMS with a premium brand
    if (w.cms === "Wix" || w.cms === "Weebly") {
      signals.push(`Brand on ${w.cms} — potential migration opportunity`);
    }

    // No CMS at all — hard to update content
    if (!w.hasCMS && !w.hasEcommerce) {
      signals.push("Static site — no CMS, hard to update");
    }
  }

  // ── Cross-source signals ──────────────────────────────────────────────────

  // Strong social but no web conversion layer
  const hasSocialFollowing =
    (data.instagram?.followers ?? 0) > 2000 ||
    (data.linkedin?.followers ?? 0) > 500;
  const hasConversionLayer =
    data.website?.hasEcommerce || data.website?.hasAnalytics;

  if (hasSocialFollowing && !hasConversionLayer && !data.website) {
    signals.push("Social presence with no web conversion layer");
  }

  return [...new Set(signals)].slice(0, 5); // cap at 5, deduplicate
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")}k`;
  return String(n);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
