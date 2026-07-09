/**
 * Smart Lead Discovery Router - Phase 5
 * Generates AI-powered proactive lead recommendations based on existing leads + agency profile.
 * Results are cached per workspace for 24 hours to avoid burning OpenAI tokens on every page load.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { generateSmartDiscoveryRecommendations } from "@/lib/ai/smart-discover";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const discoveryRouter = createTRPCRouter({
  /**
   * Returns cached Smart Discovery recommendations, or generates fresh ones if stale.
   */
  getRecommendations: protectedProcedure.query(async ({ ctx }) => {
    // 1. Check cache
    const cached = await ctx.db.smartDiscoveryCache.findFirst({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { generatedAt: "desc" },
    });

    const isFresh = cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS;
    if (isFresh && cached) {
      return {
        recommendations: (cached.recommendations as { recommendations: unknown[] }).recommendations,
        summary: cached.summary,
        generatedAt: cached.generatedAt,
        cached: true,
      };
    }

    // 2. Fetch existing leads + agency profile
    const [leads, agencyProfile] = await Promise.all([
      ctx.db.lead.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: {
          name: true,
          industry: true,
          location: true,
          opportunityScore: true,
          buyingSignals: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      ctx.db.agencyProfile.findUnique({
        where: { workspaceId: ctx.workspaceId },
      }),
    ]);

    const defaultProfile = {
      name: "My Digital Agency",
      services: [{ name: "Web Design" }, { name: "SEO" }],
      industries: ["saas", "e-commerce", "local-business"],
      techStack: ["nextjs", "react"],
      pricingModel: "project-based",
    };

    const profile = agencyProfile
      ? {
          name: agencyProfile.name,
          services: (agencyProfile.services as unknown[]) ?? [],
          industries: agencyProfile.industries,
          techStack: agencyProfile.techStack,
          pricingModel: agencyProfile.pricingModel,
        }
      : defaultProfile;

    // 3. Generate AI recommendations
    const result = await generateSmartDiscoveryRecommendations(leads, profile);

    // 4. Cache results
    await ctx.db.smartDiscoveryCache.create({
      data: {
        workspaceId: ctx.workspaceId,
        recommendations: { recommendations: result.recommendations } as object,
        summary: result.summary,
      },
    });

    return {
      recommendations: result.recommendations,
      summary: result.summary,
      generatedAt: new Date(),
      cached: false,
    };
  }),

  /**
   * Force-regenerate recommendations, bypassing the cache.
   */
  refreshRecommendations: protectedProcedure.mutation(async ({ ctx }) => {
    // Delete old cache entries
    await ctx.db.smartDiscoveryCache.deleteMany({
      where: { workspaceId: ctx.workspaceId },
    });

    const [leads, agencyProfile] = await Promise.all([
      ctx.db.lead.findMany({
        where: { workspaceId: ctx.workspaceId },
        select: { name: true, industry: true, location: true, opportunityScore: true, buyingSignals: true, status: true },
        take: 30,
      }),
      ctx.db.agencyProfile.findUnique({ where: { workspaceId: ctx.workspaceId } }),
    ]);

    const profile = agencyProfile
      ? {
          name: agencyProfile.name,
          services: (agencyProfile.services as unknown[]) ?? [],
          industries: agencyProfile.industries,
          techStack: agencyProfile.techStack,
          pricingModel: agencyProfile.pricingModel,
        }
      : { name: "My Agency", services: [], industries: [], techStack: [], pricingModel: null };

    const result = await generateSmartDiscoveryRecommendations(leads, profile);

    await ctx.db.smartDiscoveryCache.create({
      data: {
        workspaceId: ctx.workspaceId,
        recommendations: { recommendations: result.recommendations } as object,
        summary: result.summary,
      },
    });

    return { success: true, recommendations: result.recommendations, summary: result.summary };
  }),
});
