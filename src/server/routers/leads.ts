import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { orchestrator } from "@/scrapers/index";
import { SearchResult } from "@/lib/types";
import { recommendServices } from "@/lib/ai/recommend";

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
      // Add a timeout of 15 seconds to prevent hanging
      const timeoutPromise = new Promise<SearchResult[]>((_, reject) => 
        setTimeout(() => reject(new Error("Search timed out after 15 seconds")), 15000)
      );

      try {
        const results = await Promise.race([
          orchestrator.search({
            query: input.query,
            location: input.location,
            industry: input.industry,
          }, input.sources),
          timeoutPromise
        ]);
        
        // Limit results to 20 for MVP to keep UI responsive
        return results.slice(0, 20);
      } catch (error) {
        console.error("Scraper orchestrator failed:", error);
        throw new Error("Failed to complete search. Please try again or with fewer sources.");
      }
    }),

  listSaved: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.lead.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: {
        assignedTo: true,
      },
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
    
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.lead.findUnique({
        where: { id: input.id, workspaceId: ctx.workspaceId },
        include: { assignedTo: true }
      });
      if (!lead) throw new Error("Lead not found");
      return lead;
    }),

  assign: protectedProcedure
    .input(z.object({ id: z.string(), assignedToId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.lead.update({
        where: { id: input.id, workspaceId: ctx.workspaceId },
        data: { assignedToId: input.assignedToId },
        include: { assignedTo: true },
      });

      let description = "Unassigned lead";
      if (input.assignedToId) {
        description = `Assigned lead to user: ${updated.assignedTo?.name || input.assignedToId}`;
      }

      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "lead_assigned",
          description,
        }
      });

      return updated;
    }),

  addComment: protectedProcedure
    .input(z.object({ leadId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.create({
        data: {
          leadId: input.leadId,
          userId: ctx.userId,
          content: input.content,
        },
        include: { user: true },
      });

      const lead = await ctx.db.lead.findUnique({ where: { id: input.leadId } });

      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "comment_added",
          description: `Added comment to lead ${lead?.name || input.leadId}`,
        }
      });

      return comment;
    }),

  getComments: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.comment.findMany({
        where: { leadId: input.leadId },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  getServiceRecommendations: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.lead.findUnique({
        where: { id: input.id, workspaceId: ctx.workspaceId }
      });
      if (!lead) throw new Error("Lead not found");

      let agencyProfile = await ctx.db.agencyProfile.findUnique({
        where: { workspaceId: ctx.workspaceId },
      });

      const services = agencyProfile?.services as any[] || [
        { name: "Web Redesign & Development", description: "Modern React/NextJS/Tailwind frontend.", price: "$3,000 - $8,000", priority: 1 },
        { name: "SEO Audit & Optimization", description: "Optimize search ranking, fix web vitals.", price: "$1,500 - $3,000", priority: 2 },
      ];

      return recommendServices(lead, services);
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.lead.update({
        where: { id: input.id, workspaceId: ctx.workspaceId },
        data: { status: input.status },
      });
      // Log activity
      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "lead_status_updated",
          description: `Updated status of lead ${updated.name} to ${input.status}`,
        }
      });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.lead.delete({
        where: { id: input.id, workspaceId: ctx.workspaceId },
      });
      // Log activity
      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "lead_deleted",
          description: `Deleted lead ${deleted.name}`,
        }
      });
      return deleted;
    }),

  updateNotes: protectedProcedure
    .input(z.object({ id: z.string(), notes: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.lead.update({
        where: { id: input.id, workspaceId: ctx.workspaceId },
        data: { notes: input.notes },
      });
      return updated;
    }),
});
