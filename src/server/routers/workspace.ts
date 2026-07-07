import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const workspaceRouter = createTRPCRouter({
  getMembers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.workspaceMember.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: {
        user: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  inviteMember: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string(),
      clerkId: z.string(),
      role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find or create the user
      let user = await ctx.db.user.findUnique({ where: { clerkId: input.clerkId } });
      if (!user) {
        user = await ctx.db.user.create({
          data: { clerkId: input.clerkId, name: input.name, email: input.email }
        });
      }

      // Check if already member
      const existing = await ctx.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: ctx.workspaceId,
            userId: user.id,
          }
        }
      });

      if (existing) {
        throw new Error("User is already a member of this workspace.");
      }

      // Add as member
      const newMember = await ctx.db.workspaceMember.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: user.id,
          role: input.role,
        },
        include: { user: true },
      });

      // Log activity
      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "member_invited",
          description: `Simulated invitation sent to ${input.name} (${input.role})`,
        }
      });

      return newMember;
    }),

  removeMember: protectedProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userRole !== "OWNER") {
        throw new Error("Only workspace owners can remove team members.");
      }

      const member = await ctx.db.workspaceMember.findUnique({
        where: { id: input.memberId },
        include: { user: true },
      });

      if (!member) {
        throw new Error("Team member not found.");
      }

      if (member.userId === ctx.userId) {
        throw new Error("You cannot remove yourself from the workspace.");
      }

      await ctx.db.workspaceMember.delete({
        where: { id: input.memberId }
      });

      // Log activity
      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "member_removed",
          description: `Removed team member ${member.user.name}`,
        }
      });

      return { success: true };
    }),

  updateRole: protectedProcedure
    .input(z.object({ memberId: z.string(), role: z.enum(["OWNER", "MEMBER"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.userRole !== "OWNER") {
        throw new Error("Only workspace owners can change member roles.");
      }

      const member = await ctx.db.workspaceMember.findUnique({
        where: { id: input.memberId },
        include: { user: true },
      });

      if (!member) {
        throw new Error("Team member not found.");
      }

      const updated = await ctx.db.workspaceMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
        include: { user: true },
      });

      // Log activity
      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "role_updated",
          description: `Updated role of ${member.user.name} to ${input.role}`,
        }
      });

      return updated;
    }),

  getLogs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.activityLog.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),
});
