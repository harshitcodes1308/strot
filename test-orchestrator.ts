import "dotenv/config";
import { orchestrator } from "./src/scrapers/index";
async function run() {
  const linkedin = orchestrator.getScraper("linkedin");
  if (linkedin) {
    console.log("Testing LinkedIn scraper...");
    const res = await linkedin.fetch({ query: "stepoutcafe" }, { retries: 1 });
    console.log("LinkedIn results:", res.length);
  }
}
run();
