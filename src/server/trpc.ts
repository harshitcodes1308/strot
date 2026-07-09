/**
 * tRPC server setup - context creation, router factory, and procedure middleware.
 *
 * Auth strategy:
 *   1. If CLERK_SECRET_KEY is set → use Clerk auth (production)
 *   2. Otherwise → dev-mode with simulated user "dev_user_001"
 *
 * The context auto-provisions users and workspaces on first request
 * so the onboarding flow is frictionless.
 * @module
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/lib/db";

// ── Context ─────────────────────────────────────────────

export const createTRPCContext = async (opts: { headers: Headers }) => {
  let clerkId: string = "";

  try {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    clerkId = session.userId ?? "";
  } catch {
    // Clerk middleware not active for this request (e.g. public route)
    clerkId = "";
  }

  // For public routes that don't require auth, return minimal context
  if (!clerkId) {
    return { db, userId: "", workspaceId: "", userRole: "", clerkId: "", ...opts };
  }

  // 2. Ensure user exists in DB
  let dbUser = await db.user.findUnique({ where: { clerkId } });
  if (!dbUser) {
    dbUser = await db.user.create({
      data: { clerkId, name: "New User", email: `${clerkId}@strot.app` }, // Can fetch actual from Clerk later
    });
  }

  // 3. Find workspace FOR THIS USER (fixed: was findFirst() with no filter)
  let workspace = await db.workspace.findFirst({
    where: { userId: dbUser.id },
  });
  if (!workspace) {
    workspace = await db.workspace.create({
      data: { name: "My Workspace", userId: dbUser.id },
    });
  }

  // 4. Ensure workspace membership
  let membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: dbUser.id,
      },
    },
  });

  if (!membership) {
    membership = await db.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: dbUser.id,
        role: "OWNER",
      },
    });
  }

  return {
    db,
    userId: dbUser.id,
    workspaceId: workspace.id,
    userRole: membership.role,
    clerkId,
    ...opts,
  };
};

// ── tRPC init ───────────────────────────────────────────

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.workspaceId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      userRole: ctx.userRole,
    },
  });
});
