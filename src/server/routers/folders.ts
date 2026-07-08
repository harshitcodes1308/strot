import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const foldersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.folder.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: {
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),
  
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.folder.create({
        data: {
          name: input.name,
          color: input.color,
          workspaceId: ctx.workspaceId,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.folder.update({
        where: { id: input.id, workspaceId: ctx.workspaceId },
        data: { name: input.name, color: input.color },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.folder.delete({
        where: { id: input.id, workspaceId: ctx.workspaceId },
      });
    }),

  assignLead: protectedProcedure
    .input(z.object({ folderId: z.string().nullable(), leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.folderId) {
        // verify folder belongs to workspace
        const folder = await ctx.db.folder.findUnique({
          where: { id: input.folderId, workspaceId: ctx.workspaceId }
        });
        if (!folder) throw new Error("Folder not found");
      }
      
      return ctx.db.lead.update({
        where: { id: input.leadId, workspaceId: ctx.workspaceId },
        data: { folderId: input.folderId },
      });
    }),
});
