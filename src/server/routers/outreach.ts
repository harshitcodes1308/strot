import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { generateOutreachDraft, OutreachFormat } from "../../lib/ai/outreach";
import { generateMeetingBrief } from "../../lib/ai/meeting";
import { db } from "../../lib/db";
import { NormalizedLead } from "../../lib/types";
import { PostmortemData } from "../../lib/ai/postmortem";

export const outreachRouter = createTRPCRouter({
  generateDraft: protectedProcedure
    .input(z.object({ leadId: z.string(), format: z.enum(["email", "linkedin", "instagram"]) }))
    .mutation(async ({ ctx, input }) => {
      const lead = await db.lead.findUnique({
        where: { id: input.leadId, workspaceId: ctx.workspaceId },
      });
      if (!lead) throw new Error("Lead not found");

      const normalizedForAi = {
        name: lead.name,
        domain: lead.domain ?? "",
        description: lead.description ?? "",
        location: lead.location ?? "",
        industry: lead.industry ?? "",
        sourceData: {}
      } as NormalizedLead;

      const postmortem = (lead.postmortem as any) as PostmortemData | null;
      const draft = await generateOutreachDraft(input.format as OutreachFormat, normalizedForAi, postmortem, lead.buyingSignals);

      return { success: true, draft };
    }),

  generateMeetingBrief: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await db.lead.findUnique({
        where: { id: input.leadId, workspaceId: ctx.workspaceId },
      });
      if (!lead) throw new Error("Lead not found");

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

      const postmortem = (lead.postmortem as any) as PostmortemData | null;
      const brief = await generateMeetingBrief(normalizedForAi, postmortem);

      return { success: true, brief };
    }),
});
