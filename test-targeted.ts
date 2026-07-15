import { WebsiteScraper } from "./src/scrapers/website";
import { InstagramScraper } from "./src/scrapers/instagram";

async function run() {
  const ws = new WebsiteScraper();
  const ig = new InstagramScraper();

  console.log("Searching Website for 'Athlete Gym Delhi'...");
  const wRes = await ws.fetch({ query: "Athlete Gym Delhi official website", limit: 1 });
  if (wRes.length > 0) {
    console.log("Website parsed:", ws.parse(wRes[0]));
  }

  console.log("Searching IG for 'Athlete Gym Delhi'...");
  const iRes = await ig.fetch({ query: "Athlete Gym Delhi", limit: 1 });
  if (iRes.length > 0) {
    console.log("IG parsed:", ig.parse(iRes[0]));
  }
}

run();
