import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const tagsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.tag.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { name: "asc" },
    });
  }),
  
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tag.create({
        data: {
          name: input.name,
          workspaceId: ctx.workspaceId,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tag.update({
        where: { id: input.id, workspaceId: ctx.workspaceId },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tag.delete({
        where: { id: input.id, workspaceId: ctx.workspaceId },
      });
    }),

  assignLead: protectedProcedure
    .input(z.object({ tagId: z.string(), leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.lead.update({
        where: { id: input.leadId, workspaceId: ctx.workspaceId },
        data: {
          tags: {
            connect: { id: input.tagId }
          }
        },
        include: { tags: true }
      });
    }),

  removeLead: protectedProcedure
    .input(z.object({ tagId: z.string(), leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.lead.update({
        where: { id: input.leadId, workspaceId: ctx.workspaceId },
        data: {
          tags: {
            disconnect: { id: input.tagId }
          }
        },
        include: { tags: true }
      });
    }),
});
