import { chromium } from "playwright-extra";
const stealth = require("puppeteer-extra-plugin-stealth");
chromium.use(stealth());
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://html.duckduckgo.com/html/?q=site:linkedin.com/company/ stripe");
  const html = await page.content();
  console.log(html.substring(0, 1500));
  await browser.close();
}
run();
