/**
 * tRPC server setup — context creation, router factory, and procedure middleware.
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
  let clerkId: string;

  // 1. Attempt Clerk authentication
  const hasClerk = !!process.env.CLERK_SECRET_KEY;

  if (hasClerk) {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const session = await auth();
      clerkId = session.userId ?? "";
    } catch {
      // Clerk middleware not active for this request (e.g. public route)
      clerkId = "";
    }
  } else {
    // Dev mode — use cookie/header if present, otherwise default dev user
    const cookies = opts.headers.get("cookie") || "";
    const match = cookies.match(/(?:^| )simulated-user-id=([^;]+)/);
    clerkId = match?.[1] || opts.headers.get("x-user-id") || "dev_user_001";

    if (process.env.NODE_ENV === "development") {
      // Only log once per process, not every request
      logDevModeOnce();
    }
  }

  // For public routes that don't require auth, return minimal context
  if (!clerkId) {
    return { db, userId: "", workspaceId: "", userRole: "", clerkId: "", ...opts };
  }

  // 2. Ensure user exists in DB
  let dbUser = await db.user.findUnique({ where: { clerkId } });
  if (!dbUser) {
    const devUserInfo = DEV_USERS[clerkId] ?? { name: "User", email: `${clerkId}@strot.app` };
    dbUser = await db.user.create({
      data: { clerkId, name: devUserInfo.name, email: devUserInfo.email },
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

// ── Dev-mode helpers ────────────────────────────────────

/** Default dev users for simulated auth (replaces hardcoded userMap) */
const DEV_USERS: Record<string, { name: string; email: string }> = {
  dev_user_001: { name: "Test Owner", email: "owner@strot.agency" },
  // Legacy IDs for backward compat with existing cookies
  test_user_123: { name: "Test Owner", email: "owner@strot.agency" },
  test_user_456: { name: "Alice Dev", email: "alice@strot.agency" },
  test_user_789: { name: "Bob Marketer", email: "bob@strot.agency" },
};

let devModeLogged = false;
function logDevModeOnce() {
  if (!devModeLogged) {
    console.warn("[Strot] ⚠ Clerk not configured — using dev-mode auth");
    devModeLogged = true;
  }
}

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
