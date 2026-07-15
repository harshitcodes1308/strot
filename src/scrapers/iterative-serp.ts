import { db } from "@/lib/db";
import { CompanyKnowledge } from "@prisma/client";
import { VerificationEngine } from "@/lib/pipeline/verification-engine";
import crypto from "crypto";

export class IterativeSerpEngine {
  private static MAX_QUERIES = 2; // Hard limit per run to prevent excessive API costs

  /**
   * Generates intelligent search queries based on available data.
   */
  private static generateQueries(company: Partial<CompanyKnowledge>): string[] {
    const queries = [];
    const baseName = company.name || "";
    const website = company.domain ? `site:${company.domain}` : "";
    const city = company.location ? company.location.split(",")[0] : "";

    const networks = ["Instagram", "Facebook", "LinkedIn", "Twitter"];

    // Most specific to least specific
    for (const net of networks) {
      if (website) queries.push(`${baseName} ${website} ${net}`);
      if (city) queries.push(`${baseName} ${city} ${net}`);
      queries.push(`${baseName} ${net}`);
    }

    if (company.domain) {
      queries.push(`"${company.domain}" contact email`);
      queries.push(`site:${company.domain} "@"`);
    }

    // Deduplicate and filter empty
    return Array.from(new Set(queries.filter(q => q.trim().length > 0)));
  }

  /**
   * Executes a SERP query with caching.
   */
  private static async executeQuery(query: string): Promise<any[]> {
    const cacheKey = crypto.createHash("md5").update(`serp:${query}`).digest("hex");
    
    // Check cache
    const cached = await db.enrichmentCache.findUnique({ where: { cacheKey } });
    if (cached && cached.expiresAt > new Date()) {
      return cached.data as any[];
    }

    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
      console.warn("[IterativeSerp] SERP_API_KEY missing.");
      return [];
    }

    // Execute API
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`SERP API failed: ${res.status}`);
      const data = await res.json();
      const results = data.organic_results || [];

      // Cache results for 30 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      await db.enrichmentCache.upsert({
        where: { cacheKey },
        create: { cacheKey, cacheType: "SERP", data: results, expiresAt },
        update: { data: results, expiresAt }
      });

      return results;
    } catch (e) {
      console.error(`[IterativeSerp] Error executing query ${query}`, e);
      return [];
    }
  }

  /**
   * Runs the iterative search until a verified profile or email is found.
   */
  static async discover(company: Partial<CompanyKnowledge>): Promise<{ newEmails: string[], newSocials: Record<string, string> }> {
    const queries = this.generateQueries(company);
    const newEmails = new Set<string>();
    const newSocials: Record<string, string> = {};

    let queriesRun = 0;
    
    // If we already have socials, we might just be looking for emails. 
    // We'll iterate through queries and verify any found links.
    for (const query of queries) {
      if (queriesRun >= this.MAX_QUERIES) break;
      
      // Stop early if we found what we needed (naive check for now, can be optimized)
      // Usually we want at least one social and some emails.
      if (Object.keys(newSocials).length > 0 && newEmails.size > 0) {
        break;
      }

      const results = await this.executeQuery(query);
      queriesRun++;

      for (const res of results) {
        const url = res.link || "";
        const title = res.title || "";
        const snippet = res.snippet || "";
        const fullText = `${title} ${snippet}`;

        // 1. Social Extraction & Verification
        const socialMatch = url.match(/https:\/\/(www\.)?(instagram|facebook|linkedin|twitter|x)\.com\/([a-zA-Z0-9_.-]+)\/?/i);
        if (socialMatch) {
          const network = socialMatch[2].toLowerCase();
          const username = socialMatch[3].toLowerCase();

          // Reject posts, tags, reels, stories, events, generic directories
          const invalidUsernames = ['p', 'explore', 'tags', 'locations', 'reel', 'stories', 'groups', 'pages', 'events', 'company', 'in', 'search', 'hashtag', 'home', 'login', 'signup', 'watch', 'share', 'jobs'];
          if (!invalidUsernames.includes(username)) {
            if (!newSocials[network]) {
              // Attempt verification
              const vResult = VerificationEngine.verifySocialProfile(company, {
                name: title,
                bio: snippet,
                website: url,
                username: username
              });
              if (vResult.isValid) {
                newSocials[network] = url;
              }
            }
          }
        }

        // 2. Email Extraction & Verification
        const emailMatches = fullText.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g) || [];
        for (const email of emailMatches) {
          const vResult = VerificationEngine.verifyEmail(company, email);
          if (vResult.isValid || vResult.confidence === "medium") {
            newEmails.add(email.toLowerCase());
          }
        }
      }
    }

    return {
      newEmails: Array.from(newEmails),
      newSocials
    };
  }
}
