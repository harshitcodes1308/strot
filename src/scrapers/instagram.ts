/**
 * Instagram Scraper - Phase 1
 * Uses SERP API to find real Instagram business pages.
 */

import {
  LeadSourceScraper,
  BrowserConfig,
  DEFAULT_BROWSER_CONFIG,
  withRetry,
  computeCompleteness,
} from "./base";
import {
  LeadSource,
  SearchResult,
  ScraperParams,
  RawLeadData,
  NormalizedLead,
} from "@/lib/types";
import { searchDuckDuckGo } from "@/lib/ddg-search";
import { computeOpportunitySignals } from "./signals";
import crypto from "crypto";

export class InstagramScraper implements LeadSourceScraper {
  readonly id: LeadSource = "instagram";
  readonly label = "Instagram";
  readonly selectors = {};

  async fetch(
    params: ScraperParams,
    config?: Partial<BrowserConfig>
  ): Promise<RawLeadData[]> {
    const cfg = { ...DEFAULT_BROWSER_CONFIG, ...config };
    const limit = params.limit ?? 5;
    const serpKey = process.env.SERP_API_KEY;

    if (serpKey) {
      return withRetry(async () => {
        const searchQuery = `site:instagram.com ${params.query} ${params.location || ""}`.trim();
        const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(searchQuery)}&api_key=${serpKey}&num=${limit}`;
        
        try {
          const res = await fetch(searchUrl);
          if (!res.ok) {
            throw new Error(`[InstagramScraper] API error: ${res.status}`);
          }
          const data = await res.json();
          
          const results = data.organic_results ?? [];
          return results.map((r: any) => ({
            sourceId: this.id,
            raw: r
          }));
        } catch (e) {
          console.error("[InstagramScraper] Error fetching:", e);
          throw e;
        }
      }, cfg.retries, cfg.retryDelayMs);
    } else {
      // Fallback to DuckDuckGo Free Search
      return withRetry(async () => {
        const searchQuery = `site:instagram.com ${params.query} ${params.location || ""}`.trim();
        const results = await searchDuckDuckGo(searchQuery, limit);
        return results.map((r: any) => ({
          sourceId: this.id,
          raw: {
            title: r.title,
            link: r.link,
            snippet: r.snippet
          }
        }));
      }, cfg.retries, cfg.retryDelayMs);
    }
  }

  parse(raw: RawLeadData): NormalizedLead {
    const data = raw.raw as any;
    
    let handle = "";
    if (data.link) {
      const match = data.link.match(/instagram\.com\/([^\/]+)/i);
      if (match) handle = match[1];
    }
    
    // Extract profile name from title (strip " (@handle) • Instagram photos and videos" etc)
    const title = data.title || "";
    let name = handle || "Unknown Profile";
    
    // Only extract the name if the title explicitly contains the (@handle) pattern, which indicates it's a profile page, not a post
    const profileMatch = title.match(new RegExp(`^(.*?)\\s*\\(@${handle}\\)`, "i"));
    if (profileMatch && profileMatch[1]) {
       name = profileMatch[1].trim();
    } else if (title.includes("• Instagram photos and videos")) {
       const split = title.split("•")[0].trim();
       if (split && split.length < 30) {
         name = split;
       }
    }
    
    // Extract followers if present in snippet (e.g. "10K Followers, 500 Following")
    let followers = null;
    if (data.snippet) {
      const fMatch = data.snippet.match(/([\d,.]+[kKmM]?)\s+Followers/i);
      if (fMatch) {
        let fStr = fMatch[1].toLowerCase().replace(/,/g, "");
        if (fStr.endsWith('k')) followers = parseFloat(fStr) * 1000;
        else if (fStr.endsWith('m')) followers = parseFloat(fStr) * 1000000;
        else followers = parseInt(fStr, 10);
      }
    }

    
    // Aggressively extract emails and phones from snippet
    const emails: string[] = [];
    const phones: string[] = [];
    if (data.snippet) {
      const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,7}\b/gi;
      const BLACKLIST = ["sentry.io", "example.com", "domain.com", "wixpress.com", "wix.com", "cloudflare.com", "test.com", "yourdomain.com", "company.com", "name.com", "email.com", "mysite.com"];
      const emailMatches = data.snippet.match(EMAIL_REGEX);
      
      const isValidEmail = (e: string) => {
        const lower = e.toLowerCase();
        if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.jpeg') || lower.endsWith('.gif')) return false;
        if (BLACKLIST.some(domain => lower.includes(`@${domain}`))) return false;
        if (lower.startsWith("user@") || lower.startsWith("email@") || lower.startsWith("info@example") || lower.startsWith("test@") || lower.startsWith("yourname@")) return false;
        if ((lower.match(/@/g) || []).length !== 1) return false;
        if (lower.length > 50 || /^[a-f0-9]{15,}@/i.test(lower)) return false;
        return true;
      };

      if (emailMatches) {
        emailMatches.forEach((e: string) => {
          if (isValidEmail(e)) emails.push(e.toLowerCase());
        });
      }
      
      const phoneRegex = /(?:tel:|Call us:|Phone:)?\s*(\+?\d{1,3}?[-.\s]?\(?\d{1,4}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})\b/gi;
      let phoneMatch;
      while ((phoneMatch = phoneRegex.exec(data.snippet)) !== null) {
        const p = phoneMatch[1].trim();
        const digits = p.replace(/\D/g, "");
        if (digits.length >= 10 && digits.length <= 15) {
          if (!/^\d{10,}$/.test(p.replace(/\s/g, ""))) {
            phones.push(p);
          }
        }
      }
    }
    
    return {
      name,
      domain: null, // hard to get from IG serp usually
      description: data.snippet,
      sourceData: {
        instagram: {
          url: data.link,
          handle,
          followers,
          snippet: data.snippet,
        },
        extractedEmails: Array.from(new Set(emails)),
        extractedPhones: Array.from(new Set(phones))
      }
    };
  }

  normalize(lead: NormalizedLead, sourceId: LeadSource): SearchResult {
    const ig = lead.sourceData.instagram as any;
    const url = ig?.url || "";
    
    const result: Partial<SearchResult> = {
      id: crypto.createHash("md5").update(`instagram-${url}`).digest("hex"),
      name: lead.name,
      domain: lead.domain ?? null,
      description: lead.description ?? "Instagram profile",
      avatar: lead.domain ? `https://www.google.com/s2/favicons?domain=${lead.domain}&sz=128` : null,
      source: sourceId,
      sourceUrl: url,
      profileUrl: url,
      socialProfiles: {
        instagram: url,
      },
      sources: [sourceId],
      emails: (lead.sourceData?.extractedEmails as string[]) || [], 
      phones: (lead.sourceData?.extractedPhones as string[]) || [], 
      location: lead.location ?? null,
      industry: lead.industry ?? null,
      employeeCount: null, 
      foundedYear: null,
      followers: ig?.followers ?? null,
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

export function queryToHashtags(query: string, industry?: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const combined = words.join("");
  const reversed = [...words].reverse().join("");
  const tags = [combined, reversed];
  if (industry) tags.push(industry.toLowerCase().replace(/\s+/g, ""));
  if (query.toLowerCase().includes("coffee")) tags.push("specialtycoffee", "thirdwavecoffee");
  if (query.toLowerCase().includes("agency")) tags.push("designagency", "brandingagency");
  if (query.toLowerCase().includes("interior")) tags.push("interiordesign", "interiordesigner");
  return [...new Set(tags)].slice(0, 5);
}
