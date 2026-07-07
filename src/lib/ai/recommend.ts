import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const matchmakeSchema = z.object({
  score: z.number().min(0).max(100).describe("Match score from 0 to 100 based on fit."),
  pros: z.array(z.string()).describe("List of reasons why this lead is a good fit."),
  cons: z.array(z.string()).describe("List of potential challenges or mismatches."),
  summary: z.string().describe("A 2-3 sentence overview of the matchmaking analysis."),
});

export type MatchmakeData = z.infer<typeof matchmakeSchema>;

export const serviceRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    serviceName: z.string().describe("The name of the recommended service (from the agency's list)."),
    priority: z.enum(["high", "medium", "low"]).describe("Pitch priority."),
    reasoning: z.string().describe("Explanation of why this service is recommended for this lead."),
  })),
});

export type ServiceRecommendationData = z.infer<typeof serviceRecommendationSchema>;

export const proposalDraftSchema = z.object({
  title: z.string().describe("Descriptive proposal title."),
  description: z.string().describe("Brief project scope summary."),
  budget: z.number().describe("Total budget estimation based on deliverables."),
  timeline: z.array(z.object({
    phase: z.string().describe("Milestone phase name."),
    duration: z.string().describe("Duration (e.g. 'Weeks 1-2')."),
    deliverables: z.array(z.string()).describe("Deliverables in this phase."),
  })).describe("Project milestones & phases."),
  deliverables: z.array(z.object({
    title: z.string().describe("Deliverable title."),
    cost: z.number().describe("Cost allocated to this item."),
    description: z.string().describe("Brief description of what will be built."),
  })).describe("Pricing items."),
  requirements: z.string().describe("Assumptions, dependencies, or requirements needed from client."),
});

export type ProposalDraftData = z.infer<typeof proposalDraftSchema>;

export async function matchmakeAgencyLead(
  lead: any,
  agencyProfile: any
): Promise<MatchmakeData> {
  const systemPrompt = `You are a sales operations analyst for a digital agency.
Analyze the fit between the Lead and the Agency Profile.
Compare:
1. Agency Tech Stack vs Lead Tech Stack (from website research).
2. Agency Industries served vs Lead Industry.
3. Agency Services vs Lead Needs / website issues.
4. Budget, location, or pricing model fit.
Output a score from 0-100, pros, cons, and a concise summary.`;

  const prompt = `Agency Profile:
${JSON.stringify({
  name: agencyProfile.name,
  industries: agencyProfile.industries,
  techStack: agencyProfile.techStack,
  services: agencyProfile.services,
  pricingModel: agencyProfile.pricingModel,
}, null, 2)}

Lead Data:
${JSON.stringify({
  name: lead.name,
  industry: lead.industry,
  location: lead.location,
  buyingSignals: lead.buyingSignals,
  opportunityScore: lead.opportunityScore,
  postmortem: lead.postmortem,
  audit: lead.audit,
}, null, 2)}`;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: matchmakeSchema,
      system: systemPrompt,
      prompt,
    });
    return object;
  } catch (error) {
    console.error("AI Matchmake Error:", error);
    return {
      score: 50,
      pros: ["Lead is active in the region"],
      cons: ["Unable to run deep AI comparison"],
      summary: "Fallback matchmaking score generated due to processing error.",
    };
  }
}

export async function recommendServices(
  lead: any,
  services: any[]
): Promise<ServiceRecommendationData> {
  const systemPrompt = `You are a solutions architect at a digital agency.
Review the Lead's postmortem research, website issues, and buying signals.
Recommend which services from the agency's services list they should pitch.
For each recommended service, assign a priority (high/medium/low) and a custom reasoning grounded in the lead's specific problems.`;

  const prompt = `Agency Services:
${JSON.stringify(services, null, 2)}

Lead Data:
${JSON.stringify({
  name: lead.name,
  industry: lead.industry,
  buyingSignals: lead.buyingSignals,
  opportunityScore: lead.opportunityScore,
  postmortem: lead.postmortem,
  audit: lead.audit,
}, null, 2)}`;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: serviceRecommendationSchema,
      system: systemPrompt,
      prompt,
    });
    return object;
  } catch (error) {
    console.error("AI Recommend Services Error:", error);
    return {
      recommendations: (services || []).slice(0, 2).map((s: any) => ({
        serviceName: s.name || s.title || "Custom Consulting",
        priority: "medium",
        reasoning: "Suggested as a standard growth package based on general opportunities.",
      })),
    };
  }
}

export async function generateAIProposal(
  lead: any,
  services: any[]
): Promise<ProposalDraftData> {
  const systemPrompt = `You are an expert sales consultant for a boutique digital agency.
Draft a highly professional project proposal scoping brief for this Lead.
Base the scope of work on the Lead's specific business weaknesses, website audit issues, and postmortem suggestions.
Use the Agency's service menu (including descriptions and ballpark pricing) to formulate:
1. A descriptive title.
2. A scoping brief / description.
3. Pricing items (deliverables) with estimated cost allocations that sum to the total budget.
4. Scoping milestones & timeline (phases, durations, deliverables per phase).
5. Requirements & assumptions.`;

  const prompt = `Agency Services:
${JSON.stringify(services, null, 2)}

Lead Data:
${JSON.stringify({
  name: lead.name,
  industry: lead.industry,
  domain: lead.domain,
  postmortem: lead.postmortem,
  audit: lead.audit,
}, null, 2)}`;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: proposalDraftSchema,
      system: systemPrompt,
      prompt,
    });
    return object;
  } catch (error) {
    console.error("AI Proposal Generation Error:", error);
    return {
      title: `Digital Growth Proposal for ${lead.name}`,
      description: "A tailored initiative aimed at resolving website performance issues and maximizing search visibility.",
      budget: 5000,
      timeline: [
        {
          phase: "Phase 1: Discovery & Strategy",
          duration: "Weeks 1-2",
          deliverables: ["Technical Audit", "Competitor Research Matrix"],
        },
        {
          phase: "Phase 2: Execution & Optimization",
          duration: "Weeks 3-6",
          deliverables: ["Website Redesign", "SEO Implementation"],
        },
      ],
      deliverables: [
        {
          title: "Technical SEO & Speed Performance Package",
          cost: 2000,
          description: "Full speed optimization, Core Web Vitals remediation, and SEO structure audit.",
        },
        {
          title: "Custom UI/UX Redesign",
          cost: 3000,
          description: "Modernized homepage design and call-to-action optimizations.",
        },
      ],
      requirements: "Access to current hosting account, Google Analytics, and 1 strategy kickoff meeting.",
    };
  }
}
