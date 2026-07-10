import { inngest } from "../client";
import { db } from "@/lib/db";
import { generateCompanyPostmortem } from "@/lib/ai/postmortem";
import { generateOpportunityScore } from "@/lib/ai/opportunity";
import { NormalizedLead } from "@/lib/types";

export const researchLead = inngest.createFunction(
  {
    id: "research-lead",
    triggers: [{ event: "lead/research.requested" }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { leadId, userId } = event.data;

    const lead = await step.run("fetch-lead", async () => {
      return await db.lead.findUnique({
        where: { id: leadId },
      });
    });

    if (!lead) {
      return { success: false, reason: "Lead not found" };
    }

    const normalizedForAi = {
      name: lead.name,
      domain: lead.domain ?? "",
      description: lead.description ?? "",
      location: lead.location ?? "",
      industry: lead.industry ?? "",
      sourceData: {
        website: lead.website ?? undefined,
        linkedin: lead.linkedin ?? undefined,
        instagram: lead.instagram ?? undefined,
        google: lead.google ?? undefined,
      }
    } as NormalizedLead;

    // 1. Generate Postmortem
    const postmortem = await step.run("generate-postmortem", async () => {
      return await generateCompanyPostmortem(normalizedForAi);
    });

    // 2. Website Auditing (Lightweight Fallback)
    const audit = await step.run("website-audit", async () => {
      if (!lead.domain) return null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const url = /^https?:\/\//i.test(lead.domain) ? lead.domain : `https://${lead.domain}`;
        const start = Date.now();
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36" },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        return {
          status: response.status,
          responseTimeMs: Date.now() - start,
          hasSSL: url.startsWith('https://'),
          server: response.headers.get("server") || "unknown",
        };
      } catch (e) {
        return { error: "Failed to audit website", details: String(e) };
      }
    });

    // 3. Generate Opportunity Score
    const opportunityData = await step.run("generate-opportunity-score", async () => {
      const augmentedData = {
        ...normalizedForAi,
        audit,
      };
      return await generateOpportunityScore(augmentedData as any, postmortem);
    });

    // 4. Update the DB
    await step.run("update-lead", async () => {
      await db.lead.update({
        where: { id: lead.id },
        data: {
          postmortem: postmortem as any,
          audit: audit as any,
          opportunityScore: opportunityData.score,
          buyingSignals: opportunityData.buyingSignals,
        },
      });
      
      if (userId) {
        await db.activityLog.create({
          data: {
            workspaceId: lead.workspaceId,
            userId,
            action: "lead_researched",
            description: `Completed AI deep research for ${lead.name}`,
          }
        });
      }
    });

    // 5. Trigger Outreach Generation
    await step.run("trigger-outreach", async () => {
      await inngest.send({
        name: "lead/outreach.requested",
        data: {
          leadId: lead.id,
        },
      });
    });

    return { success: true, opportunityScore: opportunityData.score };
  }
);
