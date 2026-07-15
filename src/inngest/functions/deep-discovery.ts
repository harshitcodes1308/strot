import { inngest } from "../client";
import { db } from "@/lib/db";
import { EntityResolution } from "@/lib/pipeline/entity-resolution";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";
import { orchestrator } from "@/scrapers/index";
import { normalizeDomain } from "@/scrapers/base";
import { extractPainPoints } from "@/scrapers/enrichment/pain-points";

export const deepDiscovery = inngest.createFunction(
  { 
    id: "deep-discovery",
    triggers: [{ event: "scraper/deep.requested" }],
    retries: 3 
  },
  async ({ event, step }) => {
    const { runId, query, location, industry, limit = 60, sources = ["google_maps"] } = event.data;

    // 1. Fetch Run to get workspaceId
    const run = await step.run("fetch-run", async () => {
      return await db.scraperRun.findUnique({ where: { id: runId } });
    });

    if (!run) throw new Error("Run not found");
    const workspaceId = run.workspaceId;

    await step.run("update-status-running", async () => {
      await db.scraperRun.update({
        where: { id: runId },
        data: { status: "running", startedAt: new Date() },
      });
    });

    try {
      // 2. Daily Quota Check
      const remainingQuota = await step.run("check-quota", async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayLeadsCount = await db.lead.count({
          where: {
            workspaceId,
            createdAt: { gte: today }
          }
        });

        const allowed = 25 - todayLeadsCount;
        return allowed > 0 ? allowed : 0;
      });

      if (remainingQuota <= 0) {
        throw new Error("Daily limit of 25 leads reached for this workspace.");
      }

      // Fetch more raw leads initially to account for duplicates that will be filtered out
      const fetchLimit = Math.min(remainingQuota * 3, 60);

      // 3. Perform Discovery via ALL requested sources (Google Maps)
      const rawLeadsWithSource = await step.run("discovery-search", async () => {
        const fetchPromises = sources.map(async (sourceId: string) => {
          const scraper = orchestrator.getScraper(sourceId as any);
          if (!scraper) return [];
          try {
            const results = await scraper.fetch({ query, location, industry, limit: fetchLimit });
            return results.map(raw => ({ sourceId, raw }));
          } catch (e) {
            console.error(`Scraper ${sourceId} failed during discovery:`, e);
            return [];
          }
        });
        const resultsArray = await Promise.all(fetchPromises);
        return resultsArray.flat();
      });

      // 4. Deduplication
      const uniqueLeadsWithSource = await step.run("deduplicate-leads", async () => {
        const unique: typeof rawLeadsWithSource = [];
        
        for (const item of rawLeadsWithSource) {
          if (unique.length >= remainingQuota) break; // Cap at remaining quota!

          const scraper = orchestrator.getScraper(item.sourceId as any);
          if (!scraper) continue;
          
          try {
            const parsed = scraper.parse(item.raw);
            const normalized = scraper.normalize(parsed, item.sourceId as any);
            const domain = normalizeDomain(normalized.domain || null);
            const name = normalized.name;
            
            // Check if Lead already exists in this workspace
            const exists = await db.lead.findFirst({
              where: {
                workspaceId,
                OR: [
                  ...(domain ? [{ domain }] : []),
                  { name: { equals: name, mode: "insensitive" } }
                ]
              }
            });

            if (!exists) {
              unique.push(item);
            }
          } catch (e) {
            // Ignore parse errors here
          }
        }
        
        return unique;
      });

      if (uniqueLeadsWithSource.length === 0) {
        throw new Error("No unique leads found or daily limit restricts further discovery.");
      }

      // 5. Save Raw Results for the Frontend
      await step.run("save-raw-results", async () => {
        await db.rawScraperResult.createMany({
          data: uniqueLeadsWithSource.map((item) => ({
            scraperRunId: runId,
            source: item.sourceId,
            rawData: item.raw as any,
          })),
        });
      });

      // 6. Register Entities, Create Dashboard Leads, Extract Pain Points
      await step.run("register-entities-and-leads", async () => {
        for (const item of uniqueLeadsWithSource) {
          const scraper = orchestrator.getScraper(item.sourceId as any);
          if (!scraper) continue;
          
          try {
            const parsed = scraper.parse(item.raw);
            const normalized = scraper.normalize(parsed, item.sourceId as any);
            
            // Create or find in CompanyKnowledge (Global)
            const company = await EntityResolution.resolve({
              name: normalized.name,
              domain: normalized.domain || null,
              location: normalized.location || location,
            });

            // Extract Pain points if reviews exist
            let extractedPainPoints: string[] = [];
            const rawGoogle = parsed.sourceData?.google as any;
            if (rawGoogle && rawGoogle.reviews && Array.isArray(rawGoogle.reviews)) {
              const reviewTexts = rawGoogle.reviews.map((r: any) => r.text?.text).filter(Boolean);
              if (reviewTexts.length > 0) {
                extractedPainPoints = await extractPainPoints(reviewTexts);
              }
            }

            // Automatically Create Lead in User Dashboard
            await db.lead.create({
              data: {
                workspaceId,
                companyId: company.id,
                name: company.name,
                domain: company.domain,
                location: company.location,
                description: normalized.description || company.description,
                phones: normalized.phones || [],
                emails: normalized.emails || [],
                rating: rawGoogle?.rating || null,
                reviewCount: rawGoogle?.userRatingCount || null,
                source: "deep-discovery",
                status: "new",
                painPoints: extractedPainPoints,
                dataCompleteness: 10,
              }
            });

            // Fire off the background enrichment pipeline for this specific company
            await PipelineOrchestrator.evaluateAndRoute(company.id);
          } catch (e) {
            console.error(`Failed to register entity and lead`, e);
          }
        }
      });

      // 7. Unblock the UI immediately by marking the run as completed
      await step.run("update-status-completed", async () => {
        await db.scraperRun.update({
          where: { id: runId },
          data: {
            status: "completed",
            resultsCount: uniqueLeadsWithSource.length,
            completedAt: new Date(),
          },
        });
      });

      return { success: true, count: uniqueLeadsWithSource.length };
    } catch (error: any) {
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
