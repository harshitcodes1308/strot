import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { generateCompanyPostmortem } from "../../lib/ai/postmortem";
import { generateOpportunityScore } from "../../lib/ai/opportunity";
import { NormalizedLead } from "../../lib/types";

export const researchRouter = createTRPCRouter({
  generateInsights: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch the lead
      const lead = await ctx.db.lead.findUnique({
        where: { id: input.leadId, workspaceId: ctx.workspaceId },
      });

      if (!lead) throw new Error("Lead not found");

      // We need to reconstruct the "NormalizedLead" shape for the AI
      // The AI just needs a JSON representation
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

      // 2. Generate Postmortem
      const postmortem = await generateCompanyPostmortem(normalizedForAi);

      // 3. Generate Opportunity Score
      const opportunityData = await generateOpportunityScore(normalizedForAi, postmortem);

      // 4. Update the DB
      const updatedLead = await ctx.db.lead.update({
        where: { id: lead.id },
        data: {
          postmortem: postmortem as any,
          opportunityScore: opportunityData.score,
          buyingSignals: opportunityData.buyingSignals,
          // We can append suggested services to notes or something if needed, 
          // or just store the full object in a new field if we want to expand later.
        },
      });

      return { success: true, lead: updatedLead, opportunityData };
    }),
});
