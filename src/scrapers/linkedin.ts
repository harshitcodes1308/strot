/**
 * LinkedIn Scraper — Phase 1
 * Uses SERP API to find real LinkedIn company pages.
 */

import {
  LeadSourceScraper,
  BrowserConfig,
  computeCompleteness,
} from "./base";
import {
  LeadSource,
  SearchResult,
  ScraperParams,
  RawLeadData,
  NormalizedLead,
} from "@/lib/types";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

export class LinkedInScraper implements LeadSourceScraper {
  readonly id: LeadSource = "linkedin";
  readonly label = "LinkedIn";
  readonly selectors = {};

  async fetch(
    params: ScraperParams,
    config?: Partial<BrowserConfig>
  ): Promise<RawLeadData[]> {
    const limit = params.limit ?? 5;
    const serpKey = process.env.SERP_API_KEY;

    if (!serpKey) {
      console.warn("[LinkedInScraper] SERP_API_KEY not set. Returning empty.");
      return [];
    }

    // Use quotes to strictly search for the exact business/niche name
    const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(`site:linkedin.com/company/ "${params.query}" ${params.location || ""}`)}&api_key=${serpKey}&num=${limit}`;
    
    try {
      const res = await fetch(searchUrl);
      if (!res.ok) return [];
      const data = await res.json();
      
      const results = data.organic_results ?? [];
      return results.map((r: any) => ({
        sourceId: this.id,
        raw: r
      }));
    } catch (e) {
      console.error("[LinkedInScraper] Error fetching:", e);
      return [];
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const data = raw.raw as any;
    
    // Extract real company name from title (strip " | LinkedIn")
    const title = data.title || "";
    const name = title.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim() || "Unknown Company";
    
    // Extract domain from snippet if possible
    let domain = null;
    if (data.snippet) {
      const urlMatch = data.snippet.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
      if (urlMatch && !urlMatch[1].includes("linkedin.com")) {
        domain = urlMatch[1];
      }
    }

    // Aggressively extract emails and phones from snippet
    const emails: string[] = [];
    const phones: string[] = [];
    if (data.snippet) {
      const emailMatches = data.snippet.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
      if (emailMatches) {
        emailMatches.forEach((e: string) => emails.push(e.toLowerCase()));
      }
      
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const phoneMatches = data.snippet.match(phoneRegex);
      if (phoneMatches) {
        phoneMatches.forEach((p: string) => phones.push(p.trim()));
      }
    }
    
    return {
      name,
      domain,
      description: data.snippet,
      industry: "Business", // generic fallback
      sourceData: {
        linkedin: {
          url: data.link,
          title: data.title,
          snippet: data.snippet,
        },
        extractedEmails: Array.from(new Set(emails)),
        extractedPhones: Array.from(new Set(phones))
      }
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const li = lead.sourceData.linkedin as any;
    const url = li?.url || "";
    
    const result: Partial<SearchResult> = {
      id: crypto.createHash("md5").update(`linkedin-${url}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "LinkedIn company profile",
      avatar: lead.domain ? `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128` : null,
      source: sourceId,
      sourceUrl: url,
      profileUrl: url,
      socialProfiles: {
        linkedin: url,
      },
      sources: [sourceId],
      emails: (lead.sourceData?.extractedEmails as string[]) || [], 
      phones: (lead.sourceData?.extractedPhones as string[]) || [], 
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
      photos: [],
      painPoints: [],
    };
    
    (result as SearchResult).dataCompleteness = computeCompleteness(result as SearchResult);

    return result as SearchResult;
  }
}
