import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { matchmakeAgencyLead, generateAIProposal } from "@/lib/ai/recommend";

// Helper for parsing profiles
const defaultServices = [
  { name: "Web Redesign & Development", description: "Modern React/NextJS/Tailwind frontend with high performance and accessibility.", price: "$3,000 - $8,000", priority: 1 },
  { name: "SEO Audit & Optimization", description: "Optimize search ranking, fix web vitals, index structure, meta tags.", price: "$1,500 - $3,000", priority: 2 },
  { name: "Conversion Rate Optimization (CRO)", description: "Rewrite CTA funnels, build custom interactive calculators/wizards.", price: "$2,000 - $4,500", priority: 3 },
];

export const agencyRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    let profile = await ctx.db.agencyProfile.findUnique({
      where: { workspaceId: ctx.workspaceId },
    });

    if (!profile) {
      // Create a default initial profile
      profile = await ctx.db.agencyProfile.create({
        data: {
          workspaceId: ctx.workspaceId,
          slug: `agency-${ctx.workspaceId.substring(0, 8)}`,
          name: "My Digital Agency",
          tagline: "High-performance software and design solutions.",
          description: "We craft top-tier digital experiences with custom software architectures, UI/UX refinement, and data engineering.",
          services: defaultServices,
          industries: ["saas", "e-commerce", "healthcare", "local-business"],
          techStack: ["nextjs", "react", "typescript", "tailwind", "prisma", "shopify"],
          pricingModel: "project-based",
        },
      });
    }

    return profile;
  }),

  getPublicProfile: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.agencyProfile.findUnique({
        where: { slug: input.slug },
      });
      if (!profile) throw new Error("Agency profile not found");
      return profile;
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      tagline: z.string().optional(),
      description: z.string().optional(),
      services: z.array(z.object({
        name: z.string(),
        description: z.string(),
        price: z.string(),
        priority: z.number(),
      })),
      portfolio: z.array(z.object({
        title: z.string(),
        description: z.string(),
        link: z.string().optional(),
        image: z.string().optional(),
      })).optional(),
      caseStudies: z.array(z.object({
        client: z.string(),
        title: z.string(),
        challenge: z.string(),
        solution: z.string(),
        results: z.string(),
      })).optional(),
      industries: z.array(z.string()),
      techStack: z.array(z.string()),
      pricingModel: z.string().optional(),
      contactInfo: z.object({
        email: z.string().email().optional(),
        website: z.string().url().optional(),
        phone: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate unique slug if it has changed
      const current = await ctx.db.agencyProfile.findUnique({
        where: { workspaceId: ctx.workspaceId }
      });

      if (current && current.slug !== input.slug) {
        const dup = await ctx.db.agencyProfile.findUnique({ where: { slug: input.slug } });
        if (dup) throw new Error("Slug is already taken by another agency.");
      }

      const updated = await ctx.db.agencyProfile.upsert({
        where: { workspaceId: ctx.workspaceId },
        update: {
          name: input.name,
          slug: input.slug,
          tagline: input.tagline,
          description: input.description,
          services: input.services,
          portfolio: input.portfolio ?? undefined,
          caseStudies: input.caseStudies ?? undefined,
          industries: input.industries,
          techStack: input.techStack,
          pricingModel: input.pricingModel,
          contactInfo: input.contactInfo ?? undefined,
        },
        create: {
          workspaceId: ctx.workspaceId,
          name: input.name,
          slug: input.slug,
          tagline: input.tagline,
          description: input.description,
          services: input.services,
          portfolio: input.portfolio ?? undefined,
          caseStudies: input.caseStudies ?? undefined,
          industries: input.industries,
          techStack: input.techStack,
          pricingModel: input.pricingModel,
          contactInfo: input.contactInfo ?? undefined,
        },
      });

      // Log activity
      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "profile_updated",
          description: `Updated agency profile details`,
        }
      });

      return updated;
    }),

  getProposal: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.proposal.findUnique({
        where: { leadId: input.leadId },
      });
    }),

  saveProposal: protectedProcedure
    .input(z.object({
      leadId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      timeline: z.any().optional(), // Array of milestones
      deliverables: z.any().optional(), // Array of items
      budget: z.number().optional(),
      status: z.string().default("draft"),
      notes: z.string().optional(),
      requirements: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.db.proposal.upsert({
        where: { leadId: input.leadId },
        update: {
          title: input.title,
          description: input.description,
          timeline: input.timeline,
          deliverables: input.deliverables,
          budget: input.budget,
          status: input.status,
          notes: input.notes,
          requirements: input.requirements,
        },
        create: {
          leadId: input.leadId,
          workspaceId: ctx.workspaceId,
          title: input.title,
          description: input.description,
          timeline: input.timeline,
          deliverables: input.deliverables,
          budget: input.budget,
          status: input.status,
          notes: input.notes,
          requirements: input.requirements,
        },
      });

      // Log activity
      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "proposal_updated",
          description: `Saved proposal for lead: "${input.title}" (${input.status})`,
        }
      });

      return proposal;
    }),

  generateProposalAI: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.lead.findUnique({
        where: { id: input.leadId, workspaceId: ctx.workspaceId }
      });
      if (!lead) throw new Error("Lead not found");

      let agencyProfile = await ctx.db.agencyProfile.findUnique({
        where: { workspaceId: ctx.workspaceId },
      });
      const services = agencyProfile?.services as any[] || defaultServices;

      const aiDraft = await generateAIProposal(lead, services);

      // Create or update the proposal with AI draft
      const proposal = await ctx.db.proposal.upsert({
        where: { leadId: input.leadId },
        update: {
          title: aiDraft.title,
          description: aiDraft.description,
          budget: aiDraft.budget,
          timeline: aiDraft.timeline,
          deliverables: aiDraft.deliverables,
          requirements: aiDraft.requirements,
        },
        create: {
          leadId: input.leadId,
          workspaceId: ctx.workspaceId,
          title: aiDraft.title,
          description: aiDraft.description,
          budget: aiDraft.budget,
          timeline: aiDraft.timeline,
          deliverables: aiDraft.deliverables,
          requirements: aiDraft.requirements,
          status: "draft",
        },
      });

      // Log activity
      await ctx.db.activityLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: "proposal_ai_generated",
          description: `Generated AI proposal brief for lead: ${lead.name}`,
        }
      });

      return proposal;
    }),

  getMatchmaking: protectedProcedure.query(async ({ ctx }) => {
    // 1. Fetch agency profile
    let profile = await ctx.db.agencyProfile.findUnique({
      where: { workspaceId: ctx.workspaceId },
    });
    if (!profile) {
      profile = await ctx.db.agencyProfile.create({
        data: {
          workspaceId: ctx.workspaceId,
          slug: `agency-${ctx.workspaceId.substring(0, 8)}`,
          name: "My Digital Agency",
          tagline: "High-performance software and design solutions.",
          description: "We craft top-tier digital experiences.",
          services: defaultServices,
          industries: ["saas", "e-commerce", "local-business"],
          techStack: ["nextjs", "react"],
        },
      });
    }

    // 2. Fetch all saved leads
    const leads = await ctx.db.lead.findMany({
      where: { workspaceId: ctx.workspaceId },
    });

    const matches = [];
    for (const lead of leads) {
      const match = await matchmakeAgencyLead(lead, profile);
      matches.push({
        leadId: lead.id,
        leadName: lead.name,
        industry: lead.industry,
        score: match.score,
        pros: match.pros,
        cons: match.cons,
        summary: match.summary,
      });
    }

    return matches.sort((a, b) => b.score - a.score);
  }),
});
