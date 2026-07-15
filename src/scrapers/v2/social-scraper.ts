import { chromium } from "playwright-extra";
import type { Browser, Page } from "playwright-core";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import { V2WebsiteData } from "./website-scraper";

export class V2SocialScraper {
  constructor() {
    chromium.use(stealthPlugin());
  }

  async scrape(socials: V2WebsiteData['socials']): Promise<string[]> {
    const emails = new Set<string>();
    const urlsToScrape: string[] = [];

    if (socials.instagram) urlsToScrape.push(socials.instagram);
    if (socials.linkedin) urlsToScrape.push(socials.linkedin);
    if (socials.twitter) urlsToScrape.push(socials.twitter);
    if (socials.facebook) urlsToScrape.push(socials.facebook);

    if (urlsToScrape.length === 0) {
      return [];
    }

    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      });

      for (const url of urlsToScrape) {
        const page = await context.newPage();
        try {
          // Go to social page
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
          
          // Wait briefly for client-side rendering
          await page.waitForTimeout(3000);

          const content = await page.content();
          const extracted = this.extractEmails(content);
          extracted.forEach(e => emails.add(e));
        } catch (e: any) {
          console.warn(`[V2SocialScraper] Failed to scrape social URL ${url}:`, e.message);
        } finally {
          await page.close();
        }
      }
    } catch (e: any) {
      console.warn(`[V2SocialScraper] Browser launch failed:`, e.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return Array.from(emails);
  }

  private extractEmails(text: string): string[] {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = text.match(emailRegex) || [];
    // Filter out common image extensions and false positives
    return Array.from(new Set(matches)).filter(e => {
      const lower = e.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif')) return false;
      if (lower.includes('sentry.io') || lower.includes('example.com')) return false;
      return true;
    });
  }
}
