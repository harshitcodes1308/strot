import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const foldersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.folder.findMany({
      where: { workspaceId: ctx.workspaceId },
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
});
