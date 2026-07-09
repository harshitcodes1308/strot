import { inngest } from "../client";
import { db } from "@/lib/db";
import { orchestrator } from "@/scrapers/index";
import { LeadSource } from "@/lib/types";

export const runScraper = inngest.createFunction(
  { 
    id: "run-scraper",
    triggers: [{ event: "scraper/run.requested" }],
    retries: 3 
  },
  async ({ event, step }) => {
    const { runId, source, query, location, industry } = event.data;

    // 1. Update run status to running
    await step.run("update-status-running", async () => {
      await db.scraperRun.update({
        where: { id: runId },
        data: { status: "running", startedAt: new Date() },
      });
    });

    try {
      // 2. Get the scraper instance
      const scraper = orchestrator.getScraper(source as LeadSource);
      if (!scraper) {
        throw new Error(`Scraper not found for source: ${source}`);
      }

      // 3. Fetch data
      const rawResults = await step.run("fetch-data", async () => {
        return await scraper.fetch({ query, location, industry });
      });

      // 4. Save raw results
      await step.run("save-raw-results", async () => {
        if (rawResults.length > 0) {
          await Promise.all(
            rawResults.map(async (raw: any) => {
              await db.rawScraperResult.create({
                data: {
                  scraperRunId: runId,
                  source,
                  rawData: raw as any,
                },
              });
            })
          );
        }
      });

      // 5. Update run status to completed
      await step.run("update-status-completed", async () => {
        await db.scraperRun.update({
          where: { id: runId },
          data: {
            status: "completed",
            resultsCount: rawResults.length,
            completedAt: new Date(),
          },
        });
      });

      return { success: true, count: rawResults.length };
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
      throw error; // Let Inngest handle retries
    }
  }
);
