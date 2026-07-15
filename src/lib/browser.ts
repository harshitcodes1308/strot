import type { Browser } from "playwright-core";
import { BrowserConfig } from "@/scrapers/base";

let globalBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;
let activePages = 0;
let idleTimeout: NodeJS.Timeout | null = null;

export async function getSharedBrowser(config?: Partial<BrowserConfig>): Promise<Browser> {
  if (globalBrowser) {
    activePages++;
    clearIdleTimeout();
    return globalBrowser;
  }

  if (browserPromise) {
    activePages++;
    clearIdleTimeout();
    return browserPromise;
  }

  browserPromise = (async () => {
    try {
      const { chromium } = await import("playwright-extra");
      const stealth = await (import("puppeteer-extra-plugin-stealth") as any);
      chromium.use(stealth.default());

      const browser = await chromium.launch({
        headless: true,
        proxy: config?.proxy ? { server: config.proxy.server } : undefined,
      });

      globalBrowser = browser;
      return browser;
    } catch (e) {
      browserPromise = null;
      throw e;
    }
  })();

  activePages++;
  clearIdleTimeout();
  return browserPromise;
}

export function releaseSharedBrowser() {
  activePages = Math.max(0, activePages - 1);
  if (activePages === 0) {
    resetIdleTimeout();
  }
}

function clearIdleTimeout() {
  if (idleTimeout) {
    clearTimeout(idleTimeout);
    idleTimeout = null;
  }
}

function resetIdleTimeout() {
  clearIdleTimeout();
  // Close browser after 10 seconds of inactivity to free memory
  idleTimeout = setTimeout(async () => {
    if (activePages === 0 && globalBrowser) {
      try {
        await globalBrowser.close();
      } catch (e) {
        console.error("Failed to close idle browser", e);
      }
      globalBrowser = null;
      browserPromise = null;
    }
  }, 10000);
}
