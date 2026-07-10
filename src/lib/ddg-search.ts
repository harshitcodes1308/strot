import * as cheerio from "cheerio";

export async function searchDuckDuckGo(query: string, limit: number = 5): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    
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
        // DDG sometimes wraps links in //duckduckgo.com/l/?uddg= URL
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
  } catch (e) {
    console.error("[DDG Search] Failed:", e);
    return [];
  }
}
