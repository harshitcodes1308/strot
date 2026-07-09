import { inngest } from "../client";
import { db } from "@/lib/db";
import { orchestrator } from "@/scrapers/index";
import { LeadSource, RawLeadData } from "@/lib/types";

export const deepDiscovery = inngest.createFunction(
  { 
    id: "deep-discovery",
    triggers: [{ event: "scraper/deep.requested" }],
    retries: 3 
  },
  async ({ event, step }) => {
    const { runId, query, location, industry, limit = 20 } = event.data;

    // 1. Update run status to running
    await step.run("update-status-running", async () => {
      await db.scraperRun.update({
        where: { id: runId },
        data: { status: "running", startedAt: new Date() },
      });
    });

    try {
      // 2. Run Google Maps as the Anchor Engine
      const googleMapsScraper = orchestrator.getScraper("google_maps");
      if (!googleMapsScraper) throw new Error("Google Maps scraper not found");

      const anchorLeads = await step.run("fetch-anchors", async () => {
        return await googleMapsScraper.fetch({ query, location, industry, limit });
      });

      if (!anchorLeads || anchorLeads.length === 0) {
        await step.run("update-status-empty", async () => {
          await db.scraperRun.update({
            where: { id: runId },
            data: { status: "completed", resultsCount: 0, completedAt: new Date() },
          });
        });
        return { success: true, count: 0 };
      }

      // 3. Deep Enrichment for each Anchor Lead (In Parallel)
      const enrichedLeads = await step.run("deep-enrichment", async () => {
        const results: RawLeadData[] = [];
        
        const instagramScraper = orchestrator.getScraper("instagram");
        const linkedinScraper = orchestrator.getScraper("linkedin");
        const websiteScraper = orchestrator.getScraper("website");

        // Process all anchors in parallel
        await Promise.all(anchorLeads.map(async (anchor) => {
          // Push the anchor itself
          results.push(anchor);

          // Parse anchor to get the exact name and domain
          const parsedAnchor = googleMapsScraper.parse(anchor);
          const exactName = parsedAnchor.name;
          const domain = parsedAnchor.domain;

          if (!exactName) return;

          // Run Instagram, LinkedIn, and Website scrapes in parallel for this specific lead
          const tasks = [];
          
          if (instagramScraper) {
            tasks.push(
              instagramScraper.fetch({ query: exactName, location, limit: 1 })
                .then(res => { if (res && res.length > 0) results.push(res[0]); })
                .catch(e => console.error("IG Scrape failed", e))
            );
          }

          if (linkedinScraper) {
            tasks.push(
              linkedinScraper.fetch({ query: exactName, location, limit: 1 })
                .then(res => { if (res && res.length > 0) results.push(res[0]); })
                .catch(e => console.error("LI Scrape failed", e))
            );
          }

          if (websiteScraper && domain) {
            tasks.push(
              websiteScraper.fetch({ query: domain, limit: 1 })
                .then(res => { if (res && res.length > 0) results.push(res[0]); })
                .catch(e => console.error("Web Scrape failed", e))
            );
          }

          await Promise.all(tasks);
        }));
        
        return results;
      });

      // 4. Save ALL raw results to the database
      await step.run("save-raw-results", async () => {
        if (enrichedLeads.length > 0) {
          // Batch create to avoid too many DB calls
          await db.rawScraperResult.createMany({
            data: enrichedLeads.map((raw: any) => ({
              scraperRunId: runId,
              source: raw.sourceId,
              rawData: raw as any,
            })),
            skipDuplicates: true
          });
        }
      });

      // 5. Update run status to completed
      await step.run("update-status-completed", async () => {
        await db.scraperRun.update({
          where: { id: runId },
          data: {
            status: "completed",
            resultsCount: enrichedLeads.length,
            completedAt: new Date(),
          },
        });
      });

      return { success: true, count: enrichedLeads.length };
    } catch (error: any) {
      // Handle failure
      await step.run("update-status-failed", async () => {
        await db.scraperRun.update({
          where: { id: runId },
          data: {
            status: "failed",
            errorMessage: error.message || "Unknown error",
            completedAt: new Date(),
          },
        });
      });
      throw error;
    }
  }
);
