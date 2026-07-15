import { inngest } from "../client";
import { db } from "@/lib/db";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";
import { GoogleMapsScraper } from "@/scrapers/google-maps";

export const pipelineSearchFallback = inngest.createFunction(
  { id: "pipeline-search-fallback", retries: 2, triggers: [{ event: "pipeline/search.fallback.requested" }] },
  async ({ event, step }) => {
    const { companyId } = event.data;

    const company = await step.run("fetch-company", async () => {
      return await db.companyKnowledge.findUnique({ where: { id: companyId } });
    });

    if (!company) return { success: false };

    // 1. Google Business Profile Fallback
    await step.run("serp-fallback", async () => {
      console.log(`[Pipeline] Searching Google Maps for ${company.name} in ${company.location || "global"}...`);
      
      const scraper = new GoogleMapsScraper();
      const results = await scraper.fetch({ 
        query: company.name, 
        location: company.location || "",
        limit: 1 
      });

      if (results.length > 0) {
        const parsed = scraper.parse(results[0]);
        const gData = parsed.sourceData.google as any;

        const mergedPhones = Array.from(new Set([...(company.phones || [])]));
        if (gData?.phone) mergedPhones.push(gData.phone);
        
        await db.companyKnowledge.update({
          where: { id: companyId },
          data: {
            googleFreshness: new Date(),
            domain: company.domain || parsed.domain || undefined,
            location: company.location || parsed.location || undefined,
            phones: mergedPhones,
            description: company.description || parsed.description || undefined
          }
        });
      } else {
        await db.companyKnowledge.update({
          where: { id: companyId },
          data: { googleFreshness: new Date() }
        });
      }
    });

    // 2. Re-evaluate pipeline
    await step.run("evaluate-pipeline", async () => {
      await PipelineOrchestrator.evaluateAndRoute(companyId);
    });

    return { success: true };
  }
);
