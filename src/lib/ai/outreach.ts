import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NormalizedLead } from "../types";
import { PostmortemData } from "./postmortem";

export type OutreachFormat = "email" | "linkedin" | "instagram";

export async function generateOutreachDraft(
  format: OutreachFormat,
  lead: NormalizedLead,
  postmortem: PostmortemData | null,
  buyingSignals: string[] = []
): Promise<string> {
  const formatGuidelines = {
    email: "A professional cold email. Subject line included. 3-4 short paragraphs. Clear CTA.",
    linkedin: "A short, casual LinkedIn connection request or InMail. Max 300 characters for connection request, or a bit longer for InMail. Focus on networking.",
    instagram: "A casual Instagram DM. Very short, friendly, maybe use an emoji. Mention something specific from their profile."
  };

  const systemPrompt = `You are a top-tier digital agency founder doing outbound sales.
Write a highly personalized outreach message for the target lead. 
Format requested: ${format}
Guidelines: ${formatGuidelines[format]}

Avoid sounding like a generic robot. Be concise, punchy, and highlight a specific pain point or observation based on their data.
Never hallucinate facts. If data is missing, keep the observation general but relevant to their industry.`;

  const context = `
Lead Name: ${lead.name}
Industry: ${lead.industry ?? "Unknown"}
Location: ${lead.location ?? "Unknown"}
Description: ${lead.description ?? "None"}

Postmortem / AI Research:
${postmortem ? JSON.stringify(postmortem, null, 2) : "No deep research available yet."}

Buying Signals Detected:
${buyingSignals.length > 0 ? buyingSignals.join(", ") : "None detected"}
`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    prompt: context,
  });

  return text;
}
