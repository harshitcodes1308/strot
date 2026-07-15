import { inngest } from "../client";
import { db } from "@/lib/db";
import { generateOutreachDraft } from "@/lib/ai/outreach";

export const generateOutreach = inngest.createFunction(
  {
    id: "generate-outreach",
    triggers: [{ event: "lead/outreach.requested" }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const lead = await step.run("fetch-lead", async () => {
      return await db.lead.findUnique({
        where: { id: leadId },
      });
    });

    if (!lead) return { success: false, reason: "Lead not found" };

    const emailDraft = await step.run("generate-email", async () => {
      return await generateOutreachDraft("email", lead as any, lead.postmortem as any, lead.buyingSignals);
    });

    const linkedinDraft = await step.run("generate-linkedin", async () => {
      return await generateOutreachDraft("linkedin", lead as any, lead.postmortem as any, lead.buyingSignals);
    });

    await step.run("save-drafts", async () => {
      // For MVP, we can append these to the notes, or if there's a draft field, save them there.
      // Assuming no draft field currently, append to notes.
      const currentNotes = lead.notes ? lead.notes + "\n\n" : "";
      const outreachNotes = `--- AI GENERATED OUTREACH ---\n\n[Email Draft]\n\n${emailDraft}\n\n[LinkedIn Draft]\n\n${linkedinDraft}`;
      
      await db.lead.update({
        where: { id: lead.id },
        data: {
          notes: currentNotes + outreachNotes,
        },
      });
    });

    return { success: true };
  }
);
