import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { inngest } from "@/inngest/client";

export const researchRouter = createTRPCRouter({
  generateInsights: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Check if lead exists
      const lead = await ctx.db.lead.findUnique({
        where: { id: input.leadId, workspaceId: ctx.workspaceId },
      });

      if (!lead) throw new Error("Lead not found");

      // 2. Trigger background research
      await inngest.send({
        name: "lead/research.requested",
        data: {
          leadId: lead.id,
          userId: ctx.userId,
        },
      });

      return { success: true, message: "Deep research started" };
    }),
});
