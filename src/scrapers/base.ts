/**
 * Strot Scraper Engine — Base Interface
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

// ─── Core LeadSource interface ────────────────────────────────────────────────

export interface LeadSourceScraper {
  /** Unique identifier — must match the LeadSource type */
  readonly id: LeadSource;

  /** Human-readable label shown in the UI */
  readonly label: string;

  /** CSS/HTML element selectors or API endpoints for this source */
  readonly selectors: Record<string, string>;

  /**
   * STEP 1 — fetch: Run the scraper, return raw HTML/JSON blobs
   * Responsible for: browser launch, navigation, pagination, rate limiting, retries.
   * Must NOT throw on partial failures — return what it got, log what failed.
   */
  fetch(params: ScraperParams, config?: Partial<BrowserConfig>): Promise<RawLeadData[]>;

  /**
   * STEP 2 — parse: Extract structured fields from the raw blob
   * Pure function — no browser, no I/O. Given a raw HTML string or JSON,
   * return a NormalizedLead. Throw ParseError on unrecoverable extraction failure.
   */
  parse(raw: RawLeadData): NormalizedLead;

  /**
   * STEP 3 — normalize: Map NormalizedLead → SearchResult
   * Pure function. Fills in defaults, computes opportunity signals,
   * and produces a SearchResult ready for the deduplication pipeline.
   */
  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Jaro-Winkler similarity — used for name and domain matching.
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
export function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase()
    .trim();
}

/** Returns true if two SearchResults are likely the same company */
export function areDuplicates(a: SearchResult, b: SearchResult): boolean {
  const domainMatch = normalizeDomain(a.domain) === normalizeDomain(b.domain);
  if (domainMatch) return true;

  const nameSim = jaroWinkler(a.name, b.name);
  if (nameSim >= 0.88) return true;

  return false;
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
      // Merge sources
      const existing = merged[existingIdx];
      const allSources = Array.from(new Set([...existing.sources, ...result.sources])) as LeadSource[];

      // Keep the richer description (longer one wins)
      const description = result.description.length > existing.description.length
        ? result.description
        : existing.description;

      // Merge enrichment data
      merged[existingIdx] = {
        ...existing,
        ...result,
        description,
        sources: allSources,
        source: existing.source,          // keep original primary source
        linkedin: existing.linkedin ?? result.linkedin,
        instagram: existing.instagram ?? result.instagram,
        google: existing.google ?? result.google,
        website: existing.website ?? result.website,
        opportunitySignals: Array.from(new Set([
          ...(existing.opportunitySignals ?? []),
          ...(result.opportunitySignals ?? []),
        ])),
        isSaved: existing.isSaved || result.isSaved,
      };
    } else {
      merged.push({ ...result });
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

  async search(
    params: ScraperParams,
    enabledSources: LeadSource[],
    config?: Partial<BrowserConfig>
  ): Promise<SearchResult[]> {
    const activeSources = enabledSources
      .map(id => this.scrapers.get(id))
      .filter((s): s is LeadSourceScraper => !!s);

    // Run all enabled scrapers concurrently, fail gracefully per-source
    const sourceResults = await Promise.allSettled(
      activeSources.map(async scraper => {
        const raws = await scraper.fetch(params, config);
        return raws.map(raw => {
          const normalized = scraper.parse(raw);
          return scraper.normalize(normalized, scraper.id);
        });
      })
    );

    const allResults: SearchResult[] = [];
    for (const result of sourceResults) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      }
      // Rejected = source failed. Log but don't crash.
      // TODO: surface per-source error states in UI (Phase 1.5)
    }

    return deduplicateResults(allResults);
  }
}

// Global singleton orchestrator — register scrapers at app startup
export const orchestrator = new ScraperOrchestrator();
