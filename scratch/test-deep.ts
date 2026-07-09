import { orchestrator } from "../src/scrapers/index";

async function main() {
  console.log("Starting manual test...");
  
  const query = "cafe";
  const location = "delhi";
  
  console.log("Fetching anchors...");
  const googleMapsScraper = orchestrator.getScraper("google_maps");
  const anchorLeads = await googleMapsScraper!.fetch({ query, location, limit: 3 });
  
  console.log(`Found ${anchorLeads.length} anchors. Starting enrichment...`);
  
  const instagramScraper = orchestrator.getScraper("instagram");
  const linkedinScraper = orchestrator.getScraper("linkedin");
  const websiteScraper = orchestrator.getScraper("website");

  const results = [];
  
  await Promise.all(anchorLeads.map(async (anchor: any) => {
    console.log("Processing anchor:", anchor.raw?.title || anchor.raw?.name);
    results.push(anchor);
    
    const parsedAnchor = googleMapsScraper!.parse(anchor);
    const exactName = parsedAnchor.name;
    const domain = parsedAnchor.domain;

    if (!exactName) return;

    const tasks = [];
    
    if (instagramScraper) {
      tasks.push(
        instagramScraper.fetch({ query: exactName, location, limit: 1 })
          .then(res => { 
             console.log(`[IG] ${exactName} done`);
             if (res && res.length > 0) results.push(res[0]); 
          })
          .catch(e => console.error("IG Scrape failed", e))
      );
    }

    if (linkedinScraper) {
      tasks.push(
        linkedinScraper.fetch({ query: exactName, location, limit: 1 })
          .then(res => { 
             console.log(`[LI] ${exactName} done`);
             if (res && res.length > 0) results.push(res[0]); 
          })
          .catch(e => console.error("LI Scrape failed", e))
      );
    }

    if (websiteScraper && domain) {
      tasks.push(
        websiteScraper.fetch({ query: domain, limit: 1 })
          .then(res => { 
             console.log(`[Web] ${domain} done`);
             if (res && res.length > 0) results.push(res[0]); 
          })
          .catch(e => console.error("Web Scrape failed", e))
      );
    }

    await Promise.all(tasks);
    console.log("Finished all enrichments for:", exactName);
  }));
  
  console.log("Done! Total enriched items:", results.length);

  const { deduplicateResults } = require("../src/scrapers/base");
  const parsedResults = [];

  for (const raw of results) {
    let scraper;
    if (raw.sourceId) {
       scraper = orchestrator.getScraper(raw.sourceId);
    } else {
       scraper = orchestrator.getScraper("google_maps"); // manual fallback for my test script anchors
    }
    if (scraper) {
      const normalized = scraper.parse({ raw: raw.raw || raw } as any);
      parsedResults.push(scraper.normalize(normalized, scraper.id));
    }
  }

  const deduplicated = deduplicateResults(parsedResults);
  console.log("Deduplicated total:", deduplicated.length);

  const finalFiltered = deduplicated.filter(lead => {
    const hasGBP = !!lead.google?.placeId || !!lead.google?.rating;
    const hasPhone = lead.phones && lead.phones.length > 0;
    const hasEmail = lead.emails && lead.emails.length > 0;
    const hasSocial = !!(lead.socialProfiles?.instagram || lead.socialProfiles?.linkedin);
    
    console.log(`Lead: ${lead.name} | GBP: ${hasGBP} | Phone: ${hasPhone} | Email: ${hasEmail} | Social: ${hasSocial}`);
    
    if (!hasGBP || !hasPhone || !hasEmail || !hasSocial) {
      return false;
    }
    return true;
  });

  console.log("Final Filtered:", finalFiltered.length);
}

main().catch(console.error).finally(() => process.exit(0));
