/**
 * Strot Scraper Engine - Base Interface
 *
 * Every Phase 1 source (LinkedIn, Instagram, Google Maps, Company Websites)
 * and every Phase 5 expansion source implements this interface.
 *
 * Core invariant: adding a new source NEVER touches core search orchestration.
 * The orchestrator calls source.fetch() → source.parse() → source.normalize()
 * then feeds results into the shared deduplication pipeline.
 *
 * Architecture:
 *   ScraperOrchestrator
 *     ├── LinkedInScraper      (implements LeadSourceScraper)
 *     ├── InstagramScraper     (implements LeadSourceScraper)
 *     ├── GoogleMapsScraper    (implements LeadSourceScraper)
 *     └── WebsiteScraper      (implements LeadSourceScraper)
 *           ↓
 *     DeduplicationEngine (domain + name Jaro-Winkler match)
 *           ↓
 *     Normalized SearchResult[]
 */

import type { LeadSource, SearchResult, ScraperParams, RawLeadData, NormalizedLead } from "@/lib/types";

// ─── Scraper proxy / browser config ──────────────────────────────────────────

export interface BrowserConfig {
  headless: boolean;
  proxy?: {
    server: string;   // e.g. "http://proxy.provider.com:8080"
    username?: string;
    password?: string;
  };
  userAgent?: string;
  timeout: number;    // ms
  retries: number;
  retryDelayMs: number;
  rateLimit: {
    requestsPerMinute: number;
    jitterMs: number;  // random delay added between requests
  };
}

export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  headless: true,
  timeout: 30_000,
  retries: 3,
  retryDelayMs: 2_000,
  rateLimit: {
    requestsPerMinute: 20,
    jitterMs: 1_500,
  },
};

/**
 * Wrapper to execute a function with retries and exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = DEFAULT_BROWSER_CONFIG.retries,
  delayMs: number = DEFAULT_BROWSER_CONFIG.retryDelayMs
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      const backoffDelay = delayMs * Math.pow(2, attempt - 1);
      console.warn(`Scraper attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}

// ─── Core LeadSource interface ────────────────────────────────────────────────

export interface LeadSourceScraper {
  /** Unique identifier - must match the LeadSource type */
  readonly id: LeadSource;

  /** Human-readable label shown in the UI */
  readonly label: string;

  /** CSS/HTML element selectors or API endpoints for this source */
  readonly selectors: Record<string, string>;

  /**
   * STEP 1 - fetch: Run the scraper, return raw HTML/JSON blobs
   * Responsible for: browser launch, navigation, pagination, rate limiting, retries.
   * Must NOT throw on partial failures - return what it got, log what failed.
   */
  fetch(params: ScraperParams, config?: Partial<BrowserConfig>): Promise<RawLeadData[]>;

  /**
   * STEP 2 - parse: Extract structured fields from the raw blob
   * Pure function - no browser, no I/O. Given a raw HTML string or JSON,
   * return a NormalizedLead. Throw ParseError on unrecoverable extraction failure.
   */
  parse(raw: RawLeadData): NormalizedLead;

  /**
   * STEP 3 - normalize: Map NormalizedLead → SearchResult
   * Pure function. Fills in defaults, computes opportunity signals,
   * and produces a SearchResult ready for the deduplication pipeline.
   */
  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Jaro-Winkler similarity - used for name and domain matching.
 * Threshold ≥ 0.88 considered a duplicate in Phase 1.
 */
export function jaroWinkler(s1: string, t1: string): number {
  const s = s1.toLowerCase().trim();
  const t = t1.toLowerCase().trim();
  if (s === t) return 1.0;
  if (!s.length || !t.length) return 0.0;

  const matchDist = Math.max(Math.floor(Math.max(s.length, t.length) / 2) - 1, 0);
  const sMatches = new Array(s.length).fill(false);
  const tMatches = new Array(t.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s.length; i++) {
    const start = Math.max(0, i - matchDist);
    const end   = Math.min(i + matchDist + 1, t.length);
    for (let j = start; j < end; j++) {
      if (tMatches[j] || s[i] !== t[j]) continue;
      sMatches[i] = tMatches[j] = true;
      matches++;
      break;
    }
  }

  if (!matches) return 0.0;

  let k = 0;
  for (let i = 0; i < s.length; i++) {
    if (!sMatches[i]) continue;
    while (!tMatches[k]) k++;
    if (s[i] !== t[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s.length + matches / t.length + (matches - transpositions / 2) / matches) / 3;
  const prefix = [...Array(Math.min(4, s.length, t.length))].filter((_, i) => s[i] === t[i]).length;
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** Normalize a domain for comparison (strip www, protocol, trailing slash) */
export function normalizeDomain(domain: string | null): string {
  if (!domain) return "";
  return domain
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase()
    .trim();
}

export function areDuplicates(a: SearchResult, b: SearchResult): boolean {
  const normA = normalizeDomain(a.domain);
  const normB = normalizeDomain(b.domain);
  
  // 1. Domain match
  if (normA && normB && normA === normB) {
    return true;
  }

  // 2. Phone match
  const aPhones = (a.phones || []).map(p => p.replace(/\D/g, ""));
  const bPhones = (b.phones || []).map(p => p.replace(/\D/g, ""));
  if (aPhones.length > 0 && bPhones.length > 0) {
    if (aPhones.some(ap => bPhones.includes(ap))) return true;
  }

  // 3. Email match
  const aEmails = (a.emails || []).map(e => e.toLowerCase().trim());
  const bEmails = (b.emails || []).map(e => e.toLowerCase().trim());
  if (aEmails.length > 0 && bEmails.length > 0) {
    if (aEmails.some(ae => bEmails.includes(ae))) return true;
  }

  // 4. Social Profile match
  const aSocials = Object.values(a.socialProfiles || {}).filter(Boolean);
  const bSocials = Object.values(b.socialProfiles || {}).filter(Boolean);
  if (aSocials.length > 0 && bSocials.length > 0) {
    if (aSocials.some(as => bSocials.includes(as as string))) return true;
  }

  // 5. Name match (clean names first)
  const cleanName = (name: string) => {
    return name.toLowerCase()
      .replace(/\s+(llc|inc|corp|co|ltd|pvt)\.?$/i, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

  const nameA = cleanName(a.name);
  const nameB = cleanName(b.name);
  
  const nameSim = jaroWinkler(nameA, nameB);
  
  // If they have similar names AND share the same city/location (if provided), or very high name similarity
  if (nameSim >= 0.88) {
    return true;
  }

  // If one name is fully contained in the other and is at least 5 chars long
  if (nameA.length > 4 && nameB.length > 4) {
    if (nameA.includes(nameB) || nameB.includes(nameA)) {
      return true;
    }
  }

  return false;
}

export function computeCompleteness(result: Partial<SearchResult>): number {
  let score = 0;
  const weights: Record<string, number> = {
    name: 5,
    domain: 5,
    description: 5,
    emails: 25, 
    phones: 15,
    location: 5,
    industry: 5,
    socialProfiles: 10,
    followers: 5,
    avatar: 5,
    techStack: 10,
    hasWebsite: 5,
  };
  
  if (result.name) score += weights.name;
  if (result.domain) score += weights.domain;
  if (result.description) score += weights.description;
  if (result.emails && result.emails.length > 0) score += weights.emails;
  if (result.phones && result.phones.length > 0) score += weights.phones;
  if (result.location) score += weights.location;
  if (result.industry) score += weights.industry;
  if (result.socialProfiles && Object.keys(result.socialProfiles).length > 0) score += weights.socialProfiles;
  if (result.followers !== null && result.followers !== undefined) score += weights.followers;
  if (result.avatar) score += weights.avatar;
  if (result.techStack && result.techStack.length > 0) score += weights.techStack;
  if (result.hasWebsite) score += weights.hasWebsite;

  
  return Math.min(100, score);
}

/**
 * Merge a list of SearchResults from multiple scrapers.
 * When duplicates are detected, merges source lists and keeps the richer record.
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const merged: SearchResult[] = [];

  for (const result of results) {
    const existingIdx = merged.findIndex(m => areDuplicates(m, result));

    if (existingIdx >= 0) {
      const existing = merged[existingIdx];
      const allSources = Array.from(new Set([...existing.sources, ...result.sources])) as LeadSource[];

      // Keep the richer description
      const description = (result.description?.length ?? 0) > (existing.description?.length ?? 0)
        ? result.description
        : existing.description;

      const mergedSocials = { ...(existing.socialProfiles || {}), ...(result.socialProfiles || {}) };

      const mergedResult: SearchResult = {
        ...existing,
        ...result,
        name: existing.name || result.name,
        domain: existing.domain || result.domain,
        description,
        avatar: existing.avatar || result.avatar,
        sources: allSources,
        source: existing.source,          // keep original primary source
        sourceUrl: existing.sourceUrl || result.sourceUrl,
        profileUrl: existing.profileUrl || result.profileUrl,
        socialProfiles: Object.keys(mergedSocials).length > 0 ? mergedSocials : undefined,
        emails: Array.from(new Set([...(existing.emails || []), ...(result.emails || [])])),
        phones: Array.from(new Set([...(existing.phones || []), ...(result.phones || [])])),
        location: existing.location || result.location,
        industry: existing.industry || result.industry,
        employeeCount: existing.employeeCount || result.employeeCount,
        foundedYear: existing.foundedYear || result.foundedYear,
        followers: Math.max(existing.followers ?? 0, result.followers ?? 0) || null,
        engagement: Math.max(existing.engagement ?? 0, result.engagement ?? 0) || null,
        rating: Math.max(existing.rating ?? 0, result.rating ?? 0) || null,
        reviewCount: Math.max(existing.reviewCount ?? 0, result.reviewCount ?? 0) || null,
        techStack: Array.from(new Set([...(existing.techStack || []), ...(result.techStack || [])])),
        hasWebsite: existing.hasWebsite || result.hasWebsite,
        isRunningAds: existing.isRunningAds || result.isRunningAds,
        
        linkedin: existing.linkedin ?? result.linkedin,
        instagram: existing.instagram ?? result.instagram,
        google: existing.google ?? result.google,
        website: existing.website ?? result.website,
        opportunitySignals: Array.from(new Set([
          ...(existing.opportunitySignals ?? []),
          ...(result.opportunitySignals ?? []),
        ])),
        photos: Array.from(new Set([
          ...(existing.photos || []),
          ...(result.photos || [])
        ])),
        painPoints: Array.from(new Set([
          ...(existing.painPoints || []),
          ...(result.painPoints || [])
        ])),
        isSaved: existing.isSaved || result.isSaved,
        dataCompleteness: 0, // Computed below
      };
      
      mergedResult.dataCompleteness = computeCompleteness(mergedResult);
      merged[existingIdx] = mergedResult;
    } else {
      const newResult = { ...result };
      newResult.dataCompleteness = computeCompleteness(newResult);
      merged.push(newResult);
    }
  }

  return merged;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class ScraperOrchestrator {
  private scrapers: Map<LeadSource, LeadSourceScraper> = new Map();

  register(scraper: LeadSourceScraper): void {
    this.scrapers.set(scraper.id, scraper);
  }

  getScraper(id: LeadSource): LeadSourceScraper | undefined {
    return this.scrapers.get(id);
  }

  async search(
    params: ScraperParams,
    enabledSources: LeadSource[],
    context: { workspaceId: string; userId: string }
  ): Promise<string[]> {



    const { db } = await import("@/lib/db");
    const { inngest } = await import("@/inngest/client");

    const cacheKey = params.location ? `${params.query} in ${params.location}` : params.query;

    // TTL Check: Don't re-scrape the exact same query + location within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRun = await db.scraperRun.findFirst({
      where: {
        workspaceId: context.workspaceId,
        source: "deep-discovery",
        query: cacheKey,
        status: "completed",
        completedAt: { gte: twentyFourHoursAgo },
      },
    });

    if (recentRun) {
      return [recentRun.id];
    }

    const run = await db.scraperRun.create({
      data: {
        workspaceId: context.workspaceId,
        userId: context.userId,
        source: "deep-discovery",
        query: cacheKey,
        status: "pending",
      },
    });

    await inngest.send({
      name: "scraper/deep.requested",
      data: {
        runId: run.id,
        query: params.query,
        location: params.location,
        industry: params.industry,
        sources: enabledSources,
      },
    });

    return [run.id];
  }
}

// Global singleton orchestrator - register scrapers at app startup
export const orchestrator = new ScraperOrchestrator();
