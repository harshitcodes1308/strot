import "dotenv/config";
import { LinkedInScraper } from "./src/scrapers/linkedin";
async function run() {
  const scraper = new LinkedInScraper();
  try {
    const res = await scraper.fetch({ query: "stepoutcafe" });
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
