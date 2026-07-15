import { chromium } from "playwright-extra";
import type { Browser, Page } from "playwright-core";
import stealthPlugin from "puppeteer-extra-plugin-stealth";

export interface V2WebsiteData {
  emails: string[];
  phones: string[];
  socials: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

export class V2WebsiteScraper {
  constructor() {
    chromium.use(stealthPlugin());
  }

  async scrape(url: string): Promise<V2WebsiteData> {
    const data: V2WebsiteData = {
      emails: [],
      phones: [],
      socials: {}
    };

    if (!url || !url.startsWith('http')) {
      return data;
    }

    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
      });
      const page = await context.newPage();
      
      // Wait until domcontentloaded to be fast
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      
      // Wait for network idle to allow JS rendering, but don't fail if it times out
      try {
        await page.waitForLoadState("networkidle", { timeout: 10000 });
      } catch (e) {
        // Ignore timeout
      }

      const content = await page.content();
      
      // Extract emails
      data.emails = this.extractEmails(content);
      
      // Extract phones
      data.phones = this.extractPhones(content);
      
      // Extract socials
      const hrefs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map((a: HTMLAnchorElement) => a.href);
      });
      data.socials = this.extractSocials(hrefs);

    } catch (e: unknown) {
      if (e instanceof Error) {
        console.warn(`[V2WebsiteScraper] Failed to scrape ${url}:`, e.message);
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return data;
  }

  private extractEmails(text: string): string[] {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = text.match(emailRegex) || [];
    // Filter out common image extensions
    return Array.from(new Set(matches)).filter(e => {
      const lower = e.toLowerCase();
      return !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.gif');
    });
  }

  private extractPhones(text: string): string[] {
    // Basic phone regex. You might want to use a library like libphonenumber-js for robust extraction.
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const matches = text.match(phoneRegex) || [];
    return Array.from(new Set(matches.map(p => p.trim())));
  }

  private extractSocials(hrefs: string[]) {
    const socials: V2WebsiteData['socials'] = {};
    const skipList = ['wix', 'wordpress', 'shopify', 'squarespace', 'weebly', 'godaddy', 'share', 'intent/tweet', '/explore', '/sharer'];

    for (let href of hrefs) {
      if (!href) continue;
      if (typeof href !== 'string') {
        try {
          href = String(href);
        } catch {
          continue;
        }
      }
      const lower = href.toLowerCase();
      
      // Skip generic builder links or sharing links
      if (skipList.some(s => lower.includes(s))) continue;

      if (!socials.instagram && lower.includes('instagram.com/')) {
        socials.instagram = href;
      }
      if (!socials.linkedin && lower.includes('linkedin.com/')) {
        socials.linkedin = href;
      }
      if (!socials.twitter && (lower.includes('twitter.com/') || lower.includes('x.com/'))) {
        socials.twitter = href;
      }
      if (!socials.facebook && lower.includes('facebook.com/')) {
        socials.facebook = href;
      }
    }
    return socials;
  }
}
