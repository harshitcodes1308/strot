import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NormalizedLead } from "../types";

export const postmortemSchema = z.object({
  overview: z.string().describe("A 2-3 sentence overview of what the company does and its market positioning."),
  founders: z.array(z.string()).describe("Likely founders or key executives based on available data."),
  seo: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }).describe("Inferred SEO profile based on domain, industry, and social presence."),
  competitors: z.array(z.string()).describe("Likely competitors in their niche or local area."),
  recentActivity: z.string().describe("Summary of recent social posts or news if any is provided."),
  redFlags: z.array(z.string()).describe("Any potential red flags for doing business with them (e.g., poor reviews, lack of updates)."),
});

export type PostmortemData = z.infer<typeof postmortemSchema>;

export async function generateCompanyPostmortem(lead: NormalizedLead): Promise<PostmortemData> {
  const systemPrompt = `You are an expert business analyst and intelligence researcher.
Your job is to analyze the provided raw data about a business (scraped from Google Maps, LinkedIn, Instagram, and their website) and generate a concise, highly accurate 'Company Postmortem' report.
If data is missing, make reasonable educated inferences based on the industry and location, but never hallucinate hard facts like specific names if they aren't provided.`;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: postmortemSchema,
      system: systemPrompt,
      prompt: `Analyze the following lead data:\n\n${JSON.stringify(lead, null, 2)}`,
    });
    return object;
  } catch (error) {
    console.error("AI Postmortem Error:", error);
    return {
      overview: `${lead.name} is a ${lead.industry ?? "business"} based in ${lead.location ?? "an unknown location"}. ${lead.description ?? "No additional description available."}`,
      founders: [],
      seo: {
        strengths: ["Domain is registered"],
        weaknesses: ["AI research unavailable - manual review recommended"],
      },
      competitors: [],
      recentActivity: "Unable to retrieve recent activity - AI analysis failed.",
      redFlags: ["AI analysis could not be completed; manual verification needed"],
    };
  }
}
