import { searchDuckDuckGo } from "./src/lib/ddg-search";
import { getSharedBrowser } from "./src/lib/browser";

async function run() {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  await page.goto("https://html.duckduckgo.com/html/?q=gym+in+delhi", { waitUntil: "domcontentloaded" });
  const html = await page.content();
  console.log("HTML snippet:", html.substring(0, 1000));
  await page.close();
  
  const results = await searchDuckDuckGo("gym in delhi", 5);
  console.log("Results via function:", results);
}
run();
