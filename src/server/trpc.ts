import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/lib/db";

// Simulated Context for now (since we skipped Clerk)
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Use header if provided, fallback to test_user_123
  const clerkId = opts.headers.get("x-user-id") || "test_user_123";

  // Predefined users for simulated testing
  const userMap: Record<string, { name: string; email: string }> = {
    test_user_123: { name: "Test Owner", email: "owner@strot.agency" },
    test_user_456: { name: "Alice Dev", email: "alice@strot.agency" },
    test_user_789: { name: "Bob Marketer", email: "bob@strot.agency" },
  };

  const mockInfo = userMap[clerkId] || { name: "Guest Member", email: "guest@strot.agency" };

  // 1. Ensure the user exists
  let dbUser = await db.user.findUnique({ where: { clerkId } });
  if (!dbUser) {
    dbUser = await db.user.create({
      data: { clerkId, name: mockInfo.name, email: mockInfo.email }
    });
  }

  // 2. Find or create the primary workspace
  let workspace = await db.workspace.findFirst();
  if (!workspace) {
    // Find or create the owner user
    let ownerUser = await db.user.findUnique({ where: { clerkId: "test_user_123" } });
    if (!ownerUser) {
      ownerUser = await db.user.create({
        data: { clerkId: "test_user_123", name: "Test Owner", email: "owner@strot.agency" }
      });
    }
    workspace = await db.workspace.create({
      data: { name: "Main Agency Workspace", userId: ownerUser.id }
    });
  }

  // Check if database needs seeding of test leads
  const leadCount = await db.lead.count();
  if (leadCount === 0) {
    await db.lead.create({
      data: {
        workspaceId: workspace.id,
        name: "Meridian Studio",
        domain: "meridianstudio.io",
        description: "Architecture and interior design firm in NYC. Strong LinkedIn presence but weak website — no portfolio CMS, no contact form, no analytics.",
        location: "New York, NY",
        industry: "Architecture",
        sources: ["linkedin", "google_maps", "website"],
        opportunitySignals: ["Poor website performance", "No analytics detected", "Strong social, weak web"],
        buyingSignals: ["stale_website", "no_analytics", "poor_performance"],
        opportunityScore: 85,
        status: "active",
        postmortem: {
          overview: "Meridian Studio is an architecture and interior design agency operating in NYC. They have solid social presence but their website leaves a lot to be desired.",
          founders: [{ name: "Sarah Vance", role: "Principal Architect" }],
          techStack: ["WordPress", "Elementor"],
          seo: { rating: "poor", description: "Missing critical schema tags and title metadata." },
          speed: { mobile: 42, desktop: 38 },
          issues: ["No modern CMS portfolio loader", "Missing conversion calls to action", "No Google Analytics pixel detected"]
        },
        audit: {
          performance: 38,
          accessibility: 72,
          bestPractices: 60,
          seo: 45
        }
      }
    });

    await db.lead.create({
      data: {
        workspaceId: workspace.id,
        name: "Brew & Grind Coffee",
        domain: "brewandgrind.co",
        description: "Specialty coffee roaster in Portland. 4.8★ on Maps, 8k Instagram followers, but no e-commerce and dated website.",
        location: "Portland, OR",
        industry: "Food & Beverage",
        sources: ["google_maps", "instagram", "website"],
        opportunitySignals: ["No e-commerce despite strong brand", "High review velocity", "Instagram audience untapped"],
        buyingSignals: ["no_ecommerce", "high_reviews", "squarespace_outdated"],
        opportunityScore: 92,
        status: "warm",
        postmortem: {
          overview: "Brew & Grind is a popular Portland-based specialty coffee roaster. Excellent branding on Instagram and local authority but zero direct-to-consumer e-commerce checkout options on the web.",
          founders: [{ name: "Marcus Brew", role: "Founder & Roaster" }],
          techStack: ["Squarespace"],
          seo: { rating: "fair", description: "Good local indexing but weak commercial keyword reach." },
          speed: { mobile: 58, desktop: 61 },
          issues: ["No ecommerce storefront integration", "Squarespace platform limitations", "No newsletter subscription signup form"]
        },
        audit: {
          performance: 61,
          accessibility: 88,
          bestPractices: 75,
          seo: 90
        }
      }
    });
  }

  // 3. Ensure the current user has a WorkspaceMember membership in this workspace
  let membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: dbUser.id } }
  });

  if (!membership) {
    const role = clerkId === "test_user_123" ? "OWNER" : "MEMBER";
    membership = await db.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: dbUser.id,
        role,
      }
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
      userRole: ctx.userRole,
    },
  });
});
