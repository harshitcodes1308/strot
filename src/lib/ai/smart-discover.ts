import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const smartDiscoverySchema = z.object({
  recommendations: z.array(
    z.object({
      niche: z.string().describe("The specific business niche or category to target (e.g., 'Local law firms with outdated websites')."),
      searchQuery: z.string().describe("A concrete search query the user can run in Strot's Discover page (e.g., 'law firm' or 'dental clinic')."),
      location: z.string().optional().describe("Recommended geographic focus, if applicable."),
      reasoning: z.string().describe("1-2 sentences explaining why this niche is a strong match for this agency."),
      estimatedOpportunityLevel: z.enum(["high", "medium", "low"]).describe("Expected opportunity density in this niche."),
      buyingSignalsToConfigure: z.array(z.string()).describe("Buying signals to look for (e.g., 'stale_website', 'poor_reviews', 'no_ecommerce')."),
    })
  ).min(3).max(6),
  summary: z.string().describe("A 2-3 sentence strategic summary of the recommended discovery directions."),
});

export type SmartDiscoveryData = z.infer<typeof smartDiscoverySchema>;

export async function generateSmartDiscoveryRecommendations(
  existingLeads: Array<{
    name: string;
    industry?: string | null;
    location?: string | null;
    opportunityScore?: number | null;
    buyingSignals?: string[];
    status?: string;
  }>,
  agencyProfile: {
    name: string;
    services: unknown[];
    industries: string[];
    techStack: string[];
    pricingModel?: string | null;
  }
): Promise<SmartDiscoveryData> {
  const systemPrompt = `You are an expert B2B sales strategist for a digital agency.
Analyze the agency's profile and their existing saved leads.
Identify the best new niches/industries/locations to prospect in.
Your recommendations should be highly specific, actionable, and grounded in the pattern of their best-performing leads.
Think like a growth hacker finding blue-ocean opportunities where agency services are most needed.`;

  const prompt = `Agency Profile:
${JSON.stringify({
  name: agencyProfile.name,
  services: agencyProfile.services,
  industries: agencyProfile.industries,
  techStack: agencyProfile.techStack,
  pricingModel: agencyProfile.pricingModel,
}, null, 2)}

Current Saved Leads (${existingLeads.length} total):
${JSON.stringify(
  existingLeads.slice(0, 20).map((l) => ({
    name: l.name,
    industry: l.industry,
    location: l.location,
    opportunityScore: l.opportunityScore,
    buyingSignals: l.buyingSignals,
    status: l.status,
  })),
  null,
  2
)}

Based on this data, generate 3-6 proactive discovery recommendations. Focus on niches NOT yet well-represented in the current lead pool.`;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: smartDiscoverySchema,
      system: systemPrompt,
      prompt,
    });
    return object;
  } catch (error) {
    console.error("AI Smart Discovery Error:", error);
    return {
      recommendations: [
        {
          niche: "Local service businesses with no online booking",
          searchQuery: "local service business",
          location: "Your city",
          reasoning: "High density of businesses without modern booking flows — strong conversion opportunity.",
          estimatedOpportunityLevel: "high",
          buyingSignalsToConfigure: ["stale_website", "no_ecommerce", "poor_reviews"],
        },
        {
          niche: "Restaurant & hospitality brands without e-commerce",
          searchQuery: "restaurant",
          reasoning: "Post-pandemic restaurants increasingly need online ordering and delivery integrations.",
          estimatedOpportunityLevel: "high",
          buyingSignalsToConfigure: ["no_ecommerce", "low_social_presence"],
        },
        {
          niche: "Professional services (law, accounting) with outdated websites",
          searchQuery: "law firm",
          reasoning: "Professional service firms often have legacy sites built on outdated CMS with poor SEO.",
          estimatedOpportunityLevel: "medium",
          buyingSignalsToConfigure: ["stale_website", "poor_performance"],
        },
      ],
      summary:
        "Fallback recommendations generated. Connect your OpenAI API key for AI-powered personalized discovery.",
    };
  }
}
