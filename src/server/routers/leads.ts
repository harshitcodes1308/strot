import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { orchestrator } from "@/scrapers/index";
import { SearchResult } from "@/lib/types";

export const leadsRouter = createTRPCRouter({
  // Phase 1 MVP Search (Executes live scraping orchestrator)
  search: protectedProcedure
    .input(z.object({
      query: z.string(),
      location: z.string().optional(),
      industry: z.string().optional(),
      sources: z.array(z.enum(["linkedin", "instagram", "google_maps", "website"])),
    }))
    .mutation(async ({ input }) => {
      // In a production environment this would be queued or async.
      // For MVP we just run it inline.
      const results = await orchestrator.search({
        query: input.query,
        location: input.location,
        industry: input.industry,
      }, input.sources);
      return results;
    }),

  listSaved: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.lead.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }),
  
  save: protectedProcedure
    .input(z.object({
      // We accept the full SearchResult object to persist it
      id: z.string(),
      name: z.string(),
      domain: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      industry: z.string().optional(),
      sources: z.array(z.string()),
      opportunitySignals: z.array(z.string()),
      linkedin: z.any().optional(),
      instagram: z.any().optional(),
      google: z.any().optional(),
      website: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.lead.create({
        data: {
          name: input.name,
          domain: input.domain,
          description: input.description,
          location: input.location,
          industry: input.industry,
          sources: input.sources,
          opportunitySignals: input.opportunitySignals,
          linkedin: input.linkedin ?? undefined,
          instagram: input.instagram ?? undefined,
          google: input.google ?? undefined,
          website: input.website ?? undefined,
          workspaceId: ctx.workspaceId,
        },
      });
    }),
});
