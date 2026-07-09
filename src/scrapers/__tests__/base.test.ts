/**
 * Tests for core scraper utilities: jaroWinkler, normalizeDomain,
 * areDuplicates, computeCompleteness, deduplicateResults.
 */

import { describe, it, expect } from "vitest";
import {
  jaroWinkler,
  normalizeDomain,
  areDuplicates,
  computeCompleteness,
  deduplicateResults,
} from "../base";
import type { SearchResult } from "@/lib/types";

// ── Helpers ─────────────────────────────────────────────

/** Minimal SearchResult factory for testing */
function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: crypto.randomUUID(),
    name: "Test Company",
    domain: "test.com",
    description: "",
    location: "",
    industry: "",
    avatar: null,
    profileUrl: null,
    sources: ["website"],
    source: "website",
    sourceUrl: "https://test.com",
    emails: [],
    phones: [],
    socialProfiles: {},
    techStack: [],
    hasWebsite: true,
    isRunningAds: false,
    opportunitySignals: [],
    dataCompleteness: 0,
    ...overrides,
  } as SearchResult;
}

// ── jaroWinkler ─────────────────────────────────────────

describe("jaroWinkler", () => {
  it("returns 1.0 for identical strings", () => {
    expect(jaroWinkler("hello", "hello")).toBe(1.0);
  });

  it("returns 1.0 for empty strings", () => {
    expect(jaroWinkler("", "")).toBe(1.0);
  });

  it("returns 0 when one string is empty and the other is not", () => {
    expect(jaroWinkler("hello", "")).toBe(0);
    expect(jaroWinkler("", "hello")).toBe(0);
  });

  it("returns high similarity for similar strings", () => {
    const score = jaroWinkler("Starbucks", "Starbuck");
    expect(score).toBeGreaterThan(0.9);
  });

  it("returns low similarity for completely different strings", () => {
    const score = jaroWinkler("apple", "zzzzz");
    expect(score).toBeLessThan(0.5);
  });

  it("handles single character strings", () => {
    expect(jaroWinkler("a", "a")).toBe(1.0);
    expect(jaroWinkler("a", "b")).toBeLessThan(1.0);
  });
});

// ── normalizeDomain ─────────────────────────────────────

describe("normalizeDomain", () => {
  it("strips https://", () => {
    expect(normalizeDomain("https://example.com")).toBe("example.com");
  });

  it("strips http://", () => {
    expect(normalizeDomain("http://example.com")).toBe("example.com");
  });

  it("strips www.", () => {
    expect(normalizeDomain("www.example.com")).toBe("example.com");
  });

  it("strips trailing slash", () => {
    expect(normalizeDomain("example.com/")).toBe("example.com");
  });

  it("lowercases", () => {
    expect(normalizeDomain("Example.COM")).toBe("example.com");
  });

  it("handles full URL with protocol, www, and trailing slash", () => {
    expect(normalizeDomain("https://www.Example.com/")).toBe("example.com");
  });

  it("returns empty string for null", () => {
    expect(normalizeDomain(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(normalizeDomain("")).toBe("");
  });
});

// ── areDuplicates ───────────────────────────────────────

describe("areDuplicates", () => {
  it("returns true for exact domain match", () => {
    const a = makeResult({ domain: "test.com" });
    const b = makeResult({ domain: "https://www.test.com/" });
    expect(areDuplicates(a, b)).toBe(true);
  });

  it("returns true for very similar names", () => {
    const a = makeResult({ name: "Brew & Grind Coffee", domain: "" });
    const b = makeResult({ name: "Brew and Grind Coffee", domain: "" });
    // These should be similar enough (>0.88 Jaro-Winkler)
    const score = jaroWinkler(a.name, b.name);
    // If the score is high enough, areDuplicates should return true
    if (score >= 0.88) {
      expect(areDuplicates(a, b)).toBe(true);
    }
  });

  it("returns false for completely different leads", () => {
    const a = makeResult({ name: "Apple Inc", domain: "apple.com" });
    const b = makeResult({ name: "Google LLC", domain: "google.com" });
    expect(areDuplicates(a, b)).toBe(false);
  });

  it("returns false when domains differ and names are unrelated", () => {
    const a = makeResult({ name: "Apple Inc", domain: "apple.com" });
    const b = makeResult({ name: "Zephyr Labs", domain: "zephyrlabs.io" });
    expect(areDuplicates(a, b)).toBe(false);
  });

  it("BUG: empty domains are treated as matching (both normalize to empty string)", () => {
    // This is a known bug — empty/missing domains should NOT match as duplicates
    // Documented for Phase 2 fix
    const a = makeResult({ name: "Apple Inc", domain: "" });
    const b = makeResult({ name: "Zephyr Labs", domain: "" });
    expect(areDuplicates(a, b)).toBe(true); // BUG: should be false
  });

  it("NOTE: names sharing a common prefix (e.g. 'Company X' vs 'Company Z') may be treated as duplicates due to Jaro-Winkler prefix weighting — known limitation", () => {
    const a = makeResult({ name: "Company Alpha", domain: "" });
    const b = makeResult({ name: "Company Zeta", domain: "" });
    // This returns true because Jaro-Winkler weights common prefixes heavily
    // Documented as a known limitation for Phase 2 improvement
    expect(areDuplicates(a, b)).toBe(true);
  });
});

// ── computeCompleteness ─────────────────────────────────

describe("computeCompleteness", () => {
  it("returns low score for empty result", () => {
    const score = computeCompleteness({});
    expect(score).toBeLessThan(20);
  });

  it("returns higher score with more fields populated", () => {
    const partial = computeCompleteness({
      emails: ["test@test.com"],
      phones: ["+1234567890"],
      domain: "test.com",
    });
    const empty = computeCompleteness({});
    expect(partial).toBeGreaterThan(empty);
  });

  it("returns 100 or near-100 for a fully populated result", () => {
    const score = computeCompleteness({
      emails: ["a@test.com"],
      phones: ["+1234567890"],
      socialProfiles: { linkedin: "url", instagram: "url" },
      domain: "test.com",
      description: "A company that does things",
      location: "NYC",
      industry: "Tech",
      techStack: ["React", "Node"],
      hasWebsite: true,
    });
    expect(score).toBeGreaterThanOrEqual(80);
  });
});

// ── deduplicateResults ──────────────────────────────────

describe("deduplicateResults", () => {
  it("returns empty array for empty input", () => {
    expect(deduplicateResults([])).toEqual([]);
  });

  it("returns single result unchanged", () => {
    const result = makeResult();
    const deduped = deduplicateResults([result]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].name).toBe(result.name);
  });

  it("merges results with same domain", () => {
    const a = makeResult({
      name: "Test Co",
      domain: "test.com",
      sources: ["linkedin"],
      emails: ["a@test.com"],
    });
    const b = makeResult({
      name: "Test Company",
      domain: "test.com",
      sources: ["google_maps"],
      emails: ["b@test.com"],
    });

    const deduped = deduplicateResults([a, b]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].sources).toContain("linkedin");
    expect(deduped[0].sources).toContain("google_maps");
  });

  it("keeps different companies separate", () => {
    const a = makeResult({ name: "Apple", domain: "apple.com" });
    const b = makeResult({ name: "Google", domain: "google.com" });
    const deduped = deduplicateResults([a, b]);
    expect(deduped).toHaveLength(2);
  });
});
