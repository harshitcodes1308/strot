import * as cheerio from "cheerio";
import { BrowserConfig, DEFAULT_BROWSER_CONFIG } from "@/scrapers/base";
import { getSharedBrowser, releaseSharedBrowser } from "./browser";

let ddgBlocked = false;

export async function searchDuckDuckGo(
  query: string, 
  limit: number = 5,
  config?: Partial<BrowserConfig>
): Promise<{ title: string; link: string; snippet: string }[]> {
  const serpApiKey = process.env.SERP_API_KEY;

  if (serpApiKey) {
    try {
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=${limit}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const results = data.organic_results || [];
        return results.slice(0, limit).map((r: any) => ({
          title: r.title || "",
          link: r.link || "",
          snippet: r.snippet || "",
        }));
      }
    } catch (e) {
      console.warn("[DDG/SERP Search] SerpAPI failed, falling back to DDG...", e);
    }
  }

  if (ddgBlocked) {
    console.warn("[DDG Search] Skipped because DDG is currently blocking requests.");
    return [];
  }

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      },
      signal: AbortSignal.timeout(5000) // Lowered to 5s to prevent massive delays
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        ddgBlocked = true;
      }
      throw new Error(`DDG fetch failed with status: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: { title: string; link: string; snippet: string }[] = [];
    
    $('.result').each((i, el) => {
      if (results.length >= limit) return;
      
      const titleEl = $(el).find('.result__title a');
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      const snippet = $(el).find('.result__snippet').text().trim();
      
      if (title && link) {
        let actualLink = link;
        if (link.includes('uddg=')) {
          const match = link.match(/uddg=([^&]+)/);
          if (match && match[1]) {
            actualLink = decodeURIComponent(match[1]);
          }
        }
        results.push({ title, link: actualLink, snippet });
      }
    });
    
    return results;
  } catch (e: any) {
    if (e.name === 'AbortError' || e.message.includes('timeout') || e.code === 'UND_ERR_CONNECT_TIMEOUT') {
      ddgBlocked = true; // Block DDG for this session if it times out
    }
    console.error("[DDG Search] Failed:", e.message);
    return [];
  }
}
