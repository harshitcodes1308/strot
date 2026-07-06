import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/lib/db";

// Simulated Context for now (since we skipped Clerk)
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Use a hardcoded test user ID until Clerk is integrated
  const userId = "test_user_123";

  // Ensure this test user and a default workspace exist for local dev
  let workspace = await db.workspace.findFirst({ where: { userId } });
  
  if (!workspace) {
    const user = await db.user.findUnique({ where: { clerkId: userId } }) 
      ?? await db.user.create({
        data: { clerkId: userId, email: "test@example.com", name: "Test User" }
      });
      
    workspace = await db.workspace.create({
      data: { name: "My Workspace", userId: user.id }
    });
  }

  return {
    db,
    userId,
    workspaceId: workspace.id,
    ...opts,
  };
};

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
    throw new Error("UNAUTHORIZED");
  }
  return next({
    ctx: {
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    },
  });
});
