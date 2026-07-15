import { inngest } from "../client";
import { db } from "@/lib/db";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";
import { EntityResolution } from "@/lib/pipeline/entity-resolution";

export const enrichLead = inngest.createFunction(
  { 
    id: "enrich-lead",
    triggers: [{ event: "lead/enrich.requested" }],
    retries: 2
  },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const lead = await step.run("fetch-lead", async () => {
      return await db.lead.findUnique({
        where: { id: leadId },
      });
    });

    if (!lead) return { success: false, reason: "Lead not found" };

    let companyId = lead.companyId;

    // 1. Resolve CompanyKnowledge if not linked
    if (!companyId) {
      await step.run("resolve-company", async () => {
        const company = await EntityResolution.resolve({
          name: lead.name,
          domain: lead.domain || null,
          location: lead.location || null,
        });
        
        companyId = company.id;

        await db.lead.update({
          where: { id: leadId },
          data: { companyId }
        });
      });
    }

    if (!companyId) {
      return { success: false, reason: "Could not resolve company for lead" };
    }

    // 2. Delegate to the Iterative Intelligence Engine
    await step.run("trigger-orchestrator", async () => {
      await PipelineOrchestrator.evaluateAndRoute(companyId!);
    });

    return { success: true, companyId };
  }
);

