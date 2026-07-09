import { inngest } from "../client";
import { db } from "@/lib/db";
import { guessEmails } from "@/scrapers/enrichment/email-guesser";
import { verifyEmail } from "@/scrapers/enrichment/smtp-verifier";
import { extractPainPoints } from "@/scrapers/enrichment/pain-points";

export const enrichLead = inngest.createFunction(
  { 
    id: "enrich-lead",
    triggers: [{ event: "lead/enrich.requested" }],
    retries: 2
  },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const lead = await step.run("fetch-lead", async () => {
      return await db.lead.findUnique({
        where: { id: leadId },
      });
    });

    if (!lead || !lead.domain) {
      return { success: false, reason: "Lead not found or missing domain" };
    }

    const { domain, name, emails: existingEmails } = lead;
    const emailsToTest = new Set<string>([...(existingEmails || [])]);

    // If we have a name and domain, guess some emails
    if (name && domain) {
      const guessed = guessEmails(name, domain);
      guessed.forEach(e => emailsToTest.add(e));
    }

    // Always add a few generic ones just in case
    emailsToTest.add(`info@${domain}`);
    emailsToTest.add(`hello@${domain}`);
    emailsToTest.add(`contact@${domain}`);

    const verifiedEmails: string[] = [];
    const contactSources: any = typeof lead.contactSources === 'object' && lead.contactSources !== null 
        ? { ...lead.contactSources } 
        : {};

    // Verify all emails in parallel (capped at 10 to avoid spamming the MX server)
    const emailsArray = Array.from(emailsToTest).slice(0, 10);
    
    await step.run("verify-emails", async () => {
      const results = await Promise.all(
        emailsArray.map(email => verifyEmail(email))
      );

      for (const res of results) {
        if (res.confidence === "high" || res.confidence === "medium") {
          verifiedEmails.push(res.email);
          contactSources[res.email] = {
            confidence: res.confidence,
            isCatchAll: res.isCatchAll,
            reason: res.reason,
            verifiedAt: new Date().toISOString()
          };
        }
      }
    });

    // Extract pain points using AI if there are google reviews available
    let extractedPainPoints: string[] = [];
    const googleData = lead.google as any;
    if (googleData && googleData.reviews && Array.isArray(googleData.reviews) && googleData.reviews.length > 0) {
      await step.run("extract-pain-points", async () => {
        extractedPainPoints = await extractPainPoints(googleData.reviews);
      });
    }

    // Update the lead with verified emails

    await step.run("update-lead", async () => {
      // Merge with existing emails, deduplicate
      const finalEmails = Array.from(new Set([...(existingEmails || []), ...verifiedEmails]));
      
      await db.lead.update({
        where: { id: leadId },
        data: {
          emails: finalEmails,
          contactSources,
          painPoints: extractedPainPoints.length > 0 ? extractedPainPoints : lead.painPoints,
          enrichedAt: new Date(),
          // Bump data completeness if we found verified emails
          dataCompleteness: verifiedEmails.length > 0 
            ? Math.min(100, lead.dataCompleteness + 30) 
            : lead.dataCompleteness
        },
      });
    });

    return { success: true, verifiedCount: verifiedEmails.length };
  }
);
