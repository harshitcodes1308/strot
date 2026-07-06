import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NormalizedLead } from "../types";
import { PostmortemData } from "./postmortem";

export const meetingBriefSchema = z.object({
  companyOverview: z.string().describe("1-2 sentences summarizing the company."),
  founderInfo: z.string().describe("Known info about founders/key people, or 'Unknown'."),
  timeline: z.array(
    z.object({
      date: z.string(),
      event: z.string()
    })
  ).describe("Chronological timeline of inferred events (e.g., website built, recent social posts, founded year)."),
  painPoints: z.array(z.string()).describe("Likely pain points based on the audit/postmortem."),
  competitorInsights: z.array(z.string()).describe("How they stack up against the competitors listed in the postmortem."),
  suggestedAgenda: z.array(z.string()).describe("3-4 bullet points for a 30-minute discovery call agenda."),
  questionsToAsk: z.array(z.string()).describe("3-5 highly specific discovery questions to ask on the call."),
});

export type MeetingBriefData = z.infer<typeof meetingBriefSchema>;

export async function generateMeetingBrief(
  lead: NormalizedLead,
  postmortem: PostmortemData | null
): Promise<MeetingBriefData> {
  const systemPrompt = `You are an executive assistant prepping an agency founder for a discovery call.
Using the provided lead data and postmortem research, generate a highly structured Meeting Briefing document.
Synthesize a chronological timeline of events based on any available dates (e.g., founded year, last posted dates, website updates). If no exact dates exist, infer a rough sequence.`;

  const context = `
Lead Name: ${lead.name}
Industry: ${lead.industry ?? "Unknown"}
Location: ${lead.location ?? "Unknown"}
Source Data: ${JSON.stringify(lead.sourceData, null, 2)}

Postmortem:
${postmortem ? JSON.stringify(postmortem, null, 2) : "None available."}
`;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: meetingBriefSchema,
    system: systemPrompt,
    prompt: context,
  });

  return object;
}
