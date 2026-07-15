import { chromium } from "playwright-extra";
const stealth = require("puppeteer-extra-plugin-stealth");
chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.bing.com/search?q=site:instagram.com+stepoutcafe");
  
  const results = await page.$$eval("li.b_algo", (elements) => {
    return elements.map(el => {
      const titleEl = el.querySelector("h2");
      const linkEl = el.querySelector("a");
      const snippetEl = el.querySelector(".b_caption p");
      
      return {
        title: titleEl ? titleEl.textContent : null,
        link: linkEl ? linkEl.getAttribute("href") : null,
        snippet: snippetEl ? snippetEl.textContent : null
      };
    }).filter(r => r.title && r.link);
  });
  
  console.log("Bing Results:", results);
  await browser.close();
}
run();
