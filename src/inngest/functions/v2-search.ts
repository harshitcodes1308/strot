import { inngest } from "../client";
import { db } from "@/lib/db";
import { V2ScraperOrchestrator } from "@/scrapers/v2/orchestrator";

export const v2SearchRun = inngest.createFunction(
  { 
    id: "v2-search-run",
    triggers: [{ event: "scraper/v2.search" }]
  },
  async ({ event, step }) => {
    const { runId, query, location, limit, workspaceId, userId } = event.data;

    // 1. Mark run as running
    await step.run("mark-run-running", async () => {
      await db.scraperRun.update({
        where: { id: runId },
        data: { status: "running", startedAt: new Date() },
      });
    });

    // 2. Execute V2 Scraper
    const { addedCount, message } = await step.run("execute-v2-scraper", async () => {
      const orchestrator = new V2ScraperOrchestrator();
      return await orchestrator.runSearch({
        runId,
        query,
        location,
        limit,
        workspaceId,
        userId
      });
    });

    // 3. Mark run as completed
    await step.run("mark-run-completed", async () => {
      await db.scraperRun.update({
        where: { id: runId },
        data: { 
          status: "completed", 
          completedAt: new Date(),
          resultsCount: addedCount,
          errorMessage: message 
        },
      });
    });

    return { addedCount, message };
  }
);
