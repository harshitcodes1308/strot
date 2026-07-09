/**
 * Database seed script — populates dev/test data.
 * Run with: npm run seed
 * Idempotent — safe to run multiple times.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // 1. Create test user
  const owner = await prisma.user.upsert({
    where: { clerkId: "dev_user_001" },
    update: {},
    create: {
      clerkId: "dev_user_001",
      name: "Test Owner",
      email: "owner@strot.agency",
    },
  });
  console.log(`  ✓ User: ${owner.name} (${owner.id})`);

  // 2. Create workspace
  let workspace = await prisma.workspace.findFirst({
    where: { userId: owner.id },
  });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: "Main Agency Workspace", userId: owner.id },
    });
    console.log(`  ✓ Workspace: ${workspace.name} (created)`);
  } else {
    console.log(`  ✓ Workspace: ${workspace.name} (exists)`);
  }

  // 3. Ensure membership
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: owner.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: owner.id,
      role: "OWNER",
    },
  });
  console.log("  ✓ Workspace membership: OWNER");

  // 4. Create sample leads (only if none exist)
  const leadCount = await prisma.lead.count({
    where: { workspaceId: workspace.id },
  });

  if (leadCount === 0) {
    await prisma.lead.create({
      data: {
        workspaceId: workspace.id,
        name: "Meridian Studio",
        domain: "meridianstudio.io",
        description:
          "Architecture and interior design firm in NYC. Strong LinkedIn presence but weak website — no portfolio CMS, no contact form, no analytics.",
        location: "New York, NY",
        industry: "Architecture",
        sources: ["linkedin", "google_maps", "website"],
        opportunitySignals: [
          "Poor website performance",
          "No analytics detected",
          "Strong social, weak web",
        ],
        buyingSignals: ["stale_website", "no_analytics", "poor_performance"],
        opportunityScore: 85,
        status: "active",
        postmortem: {
          overview:
            "Meridian Studio is an architecture and interior design agency operating in NYC. They have solid social presence but their website leaves a lot to be desired.",
          founders: [{ name: "Sarah Vance", role: "Principal Architect" }],
          techStack: ["WordPress", "Elementor"],
          seo: {
            rating: "poor",
            description:
              "Missing critical schema tags and title metadata.",
          },
          speed: { mobile: 42, desktop: 38 },
          issues: [
            "No modern CMS portfolio loader",
            "Missing conversion calls to action",
            "No Google Analytics pixel detected",
          ],
        },
        audit: {
          performance: 38,
          accessibility: 72,
          bestPractices: 60,
          seo: 45,
        },
      },
    });

    await prisma.lead.create({
      data: {
        workspaceId: workspace.id,
        name: "Brew & Grind Coffee",
        domain: "brewandgrind.co",
        description:
          "Specialty coffee roaster in Portland. 4.8★ on Maps, 8k Instagram followers, but no e-commerce and dated website.",
        location: "Portland, OR",
        industry: "Food & Beverage",
        sources: ["google_maps", "instagram", "website"],
        opportunitySignals: [
          "No e-commerce despite strong brand",
          "High review velocity",
          "Instagram audience untapped",
        ],
        buyingSignals: [
          "no_ecommerce",
          "high_reviews",
          "squarespace_outdated",
        ],
        opportunityScore: 92,
        status: "warm",
        postmortem: {
          overview:
            "Brew & Grind is a popular Portland-based specialty coffee roaster. Excellent branding on Instagram and local authority but zero direct-to-consumer e-commerce checkout options on the web.",
          founders: [{ name: "Marcus Brew", role: "Founder & Roaster" }],
          techStack: ["Squarespace"],
          seo: {
            rating: "fair",
            description:
              "Good local indexing but weak commercial keyword reach.",
          },
          speed: { mobile: 58, desktop: 61 },
          issues: [
            "No ecommerce storefront integration",
            "Squarespace platform limitations",
            "No newsletter subscription signup form",
          ],
        },
        audit: {
          performance: 61,
          accessibility: 88,
          bestPractices: 75,
          seo: 90,
        },
      },
    });

    console.log("  ✓ Sample leads: Meridian Studio, Brew & Grind Coffee");
  } else {
    console.log(`  ✓ Leads: ${leadCount} already exist (skipped)`);
  }

  // 5. Create additional test users
  const alice = await prisma.user.upsert({
    where: { clerkId: "test_user_456" },
    update: {},
    create: {
      clerkId: "test_user_456",
      name: "Alice Dev",
      email: "alice@strot.agency",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: alice.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: alice.id,
      role: "MEMBER",
    },
  });
  console.log(`  ✓ Team member: ${alice.name} (MEMBER)`);

  console.log("\n✅ Seed complete.\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
