import { withRetry, DEFAULT_BROWSER_CONFIG } from "../base";

export async function findEmailViaSocial(companyName: string, domain: string | null): Promise<string[]> {
  const serpKey = process.env.SERP_API_KEY;
  if (!serpKey || !companyName) return [];

  return withRetry(async () => {
    // We search across instagram and facebook for the company name, along with an "@" symbol.
    // If they have a domain, we specifically look for @domain.com. Otherwise @gmail.com or generic.
    const emailTarget = domain ? `\"@${domain}\"` : `\"@gmail.com\" OR \"@yahoo.com\" OR \"@hotmail.com\" OR \"@outlook.com\"`;
    const query = `(site:facebook.com OR site:instagram.com) "${companyName}" ${emailTarget}`;
    
    const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpKey}&num=5`;
    const res = await fetch(searchUrl);
    
    if (!res.ok) {
      throw new Error(`[SocialEmail] SERP API error: ${res.status}`);
    }
    
    const data = await res.json();
    const results = data.organic_results ?? [];
    
    const emails = new Set<string>();
    const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,7}\b/gi;
    const BLACKLIST = ["sentry.io", "example.com", "domain.com", "wixpress.com", "wix.com", "cloudflare.com", "test.com", "company.com", "name.com", "email.com"];

    const isValidEmail = (e: string) => {
      const lower = e.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.jpeg') || lower.endsWith('.gif')) return false;
      if (BLACKLIST.some(domain => lower.includes(`@${domain}`))) return false;
      if ((lower.match(/@/g) || []).length !== 1) return false;
      return true;
    };

    results.forEach((r: any) => {
      if (r.snippet) {
        const matches = r.snippet.match(EMAIL_REGEX);
        if (matches) {
          matches.forEach((e: string) => {
            if (isValidEmail(e)) emails.add(e.toLowerCase());
          });
        }
      }
    });

    return Array.from(emails);
  }, 2, 1000);
}
