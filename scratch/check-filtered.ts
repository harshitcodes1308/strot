import "dotenv/config";
import { db } from "../src/lib/db";
import { orchestrator } from "../src/scrapers/index";
import { deduplicateResults } from "../src/scrapers/base";

async function main() {
  const runId = '47dc639b-129e-464c-a330-04d5da01c2f2'; // User's latest run
  const rawResults = await db.rawScraperResult.findMany({
    where: { scraperRunId: runId },
  });
  
  console.log(`Found ${rawResults.length} raw results in DB.`);

  const parsedResults = [];
  for (const result of rawResults) {
    const scraper = orchestrator.getScraper(result.source as any);
    if (scraper) {
      try {
        const normalized = scraper.parse(result.rawData as any);
        parsedResults.push(scraper.normalize(normalized, scraper.id));
      } catch(e) {
        console.error("Parse error for", result.source);
      }
    }
  }

  const deduplicated = deduplicateResults(parsedResults);
  console.log(`Deduplicated into ${deduplicated.length} leads.`);

  for (const lead of deduplicated) {
    const hasGBP = !!lead.google?.placeId || !!lead.google?.rating;
    const hasPhone = lead.phones && lead.phones.length > 0;
    const hasEmail = lead.emails && lead.emails.length > 0;
    const hasSocial = !!(lead.socialProfiles?.instagram || lead.socialProfiles?.linkedin);
    
    console.log(`\nLead: ${lead.name}`);
    console.log(`GBP: ${hasGBP}, Phone: ${hasPhone} (${lead.phones?.length}), Email: ${hasEmail} (${lead.emails?.length}), Social: ${hasSocial}`);
    if (!hasEmail) console.log("Missing Email!");
    if (!hasPhone) console.log("Missing Phone!");
    if (!hasSocial) console.log("Missing Social!");
  }
}

main().catch(console.error).finally(() => process.exit(0));
