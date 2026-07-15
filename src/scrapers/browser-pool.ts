import { chromium, Browser, BrowserContext, Page } from "playwright-core";
import { firefox, webkit } from "playwright-core";
import { chromium as extraChromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import Tesseract from "tesseract.js";

// Add stealth plugin
extraChromium.use(stealth());

export interface BrowserPoolConfig {
  useProxy?: boolean;
  proxyUrl?: string; // e.g. "http://user:pass@proxy.provider.com:8080"
  headless?: boolean;
}

export class BrowserLayer {
  static async getContext(config?: BrowserPoolConfig): Promise<{ browser: Browser; context: BrowserContext }> {
    const launchOptions: any = {
      headless: config?.headless ?? true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    if (config?.useProxy && config?.proxyUrl) {
      launchOptions.proxy = { server: config.proxyUrl };
    }

    const browser = await extraChromium.launch(launchOptions);
    
    // Create a context with random user agent to avoid basic fingerprinting
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    // Request interception to block tracking, ads, and unnecessary media (cost optimization)
    await context.route('**/*', (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      
      // Block heavy resources if we only need text/DOM
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        // If we need to extract emails from images (OCR), we should NOT block images on the contact page.
        // For phase 1, we block it to save proxy bandwidth unless explicitly needed.
        route.abort();
      } else if (request.url().includes('google-analytics.com') || request.url().includes('facebook.com/tr')) {
        route.abort(); // Block trackers
      } else {
        route.continue();
      }
    });

    return { browser, context };
  }

  static async extractTextFromImage(imageUrl: string): Promise<string> {
    try {
      console.log(`[BrowserLayer] Running OCR on ${imageUrl}`);
      const result = await Tesseract.recognize(imageUrl, 'eng');
      return result.data.text;
    } catch (e) {
      console.error(`[BrowserLayer] OCR failed for ${imageUrl}:`, e);
      return "";
    }
  }

  /**
   * Helper to evaluate page for Cloudflare/Captcha blocks
   */
  static async checkCaptcha(page: Page): Promise<boolean> {
    const isCloudflare = await page.evaluate(() => {
      return !!document.querySelector('#cf-wrapper') || !!document.title.includes('Just a moment...');
    });
    return isCloudflare;
  }
}
