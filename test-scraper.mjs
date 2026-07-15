import { V2GooglePlacesScraper } from './src/scrapers/v2/google-places.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const scraper = new V2GooglePlacesScraper();
  const res = await scraper.search("clothing", "delhi", 5);
  console.log(res);
}

main().catch(console.error);
