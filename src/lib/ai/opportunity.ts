import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NormalizedLead } from "../types";
import { PostmortemData } from "./postmortem";

export const opportunityScoreSchema = z.object({
  score: z.number().min(0).max(100).describe("A score from 0 to 100 indicating how good of a lead this is for an agency."),
  buyingSignals: z.array(z.string()).describe("Specific tags indicating readiness to buy (e.g., 'hiring', 'stale_website', 'poor_reviews')."),
  suggestedServices: z.array(z.string()).describe("Services to pitch them (e.g., 'Web Redesign', 'SEO Optimization', 'Social Media Management')."),
  reasoning: z.string().describe("A 1-2 sentence explanation of why they received this score."),
});

export type OpportunityScoreData = z.infer<typeof opportunityScoreSchema>;

export async function generateOpportunityScore(lead: NormalizedLead, postmortem: PostmortemData): Promise<OpportunityScoreData> {
  const systemPrompt = `You are a sales engineer for a digital agency.
Analyze the lead data and the generated postmortem.
Determine an Opportunity Score (0-100) based on how likely they are to need web design, SEO, or marketing services.
Look for buying signals like: low Google ratings, missing or outdated website, lack of social media presence, or signs of recent growth (hiring, new locations) that outpace their brand presence.`;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: opportunityScoreSchema,
    system: systemPrompt,
    prompt: `Lead Data:\n${JSON.stringify(lead, null, 2)}\n\nPostmortem:\n${JSON.stringify(postmortem, null, 2)}`,
  });

  return object;
}
