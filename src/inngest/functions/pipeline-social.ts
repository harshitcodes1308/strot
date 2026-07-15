import { inngest } from "../client";
import { db } from "@/lib/db";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";
import { IterativeSerpEngine } from "@/scrapers/iterative-serp";

export const pipelineSocialSearch = inngest.createFunction(
  { id: "pipeline-social-search", retries: 2, triggers: [{ event: "pipeline/social.search.requested" }] },
  async ({ event, step }) => {
    const { companyId } = event.data;

    const company = await step.run("fetch-company", async () => {
      return await db.companyKnowledge.findUnique({ where: { id: companyId } });
    });

    if (!company) return { success: false };

    // 1. Search Social Profiles and Emails via SERP
    await step.run("social-search", async () => {
      console.log(`[Pipeline] Searching iterative SERP for ${company.domain || company.name}...`);
      
      const { newEmails, newSocials } = await IterativeSerpEngine.discover(company as any);
      
      const mergedSocials = { ...(company.socialProfiles as Record<string, string> || {}), ...newSocials };
      const mergedEmails = Array.from(new Set([...(company.emails || []), ...newEmails]));

      await db.companyKnowledge.update({
        where: { id: companyId },
        data: {
          socialFreshness: new Date(), // Prevents infinite loops
          socialProfiles: mergedSocials,
          emails: mergedEmails
        }
      });
    });

    // 2. Re-evaluate pipeline
    await step.run("evaluate-pipeline", async () => {
      await PipelineOrchestrator.evaluateAndRoute(companyId);
    });

    return { success: true };
  }
);
