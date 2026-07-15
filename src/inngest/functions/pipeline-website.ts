import { inngest } from "../client";
import { db } from "@/lib/db";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";
import { WebsiteScraper } from "@/scrapers/website";

export const pipelineWebsiteCrawl = inngest.createFunction(
  { id: "pipeline-website-crawl", retries: 2, triggers: [{ event: "pipeline/website.crawl.requested" }] },
  async ({ event, step }) => {
    const { companyId, deepCrawl } = event.data;

    const company = await step.run("fetch-company", async () => {
      return await db.companyKnowledge.findUnique({ where: { id: companyId } });
    });

    if (!company || !company.domain) {
      return { success: false, reason: "No domain to crawl." };
    }

    // 1. Crawl Website
    await step.run("cheerio-crawl", async () => {
      console.log(`[Pipeline] Crawling website for ${company.domain} (Deep: ${!!deepCrawl})...`);
      const scraper = new WebsiteScraper();
      const results = await scraper.fetch(
        { query: company.domain, limit: 1, location: "" }, 
        { deepCrawl: !!deepCrawl } as any
      );

      if (results.length > 0) {
        const parsed = scraper.parse(results[0]);
        const extractedEmails = (parsed.sourceData as any).extractedEmails || [];
        const extractedPhones = (parsed.sourceData as any).extractedPhones || [];
        const extractedSocials = (parsed.sourceData as any).extractedSocials || [];
        
        const socialProfiles: Record<string, string> = (company.socialProfiles as any) || {};
        extractedSocials.forEach((url: string) => {
          if (url.includes("instagram.com") && !socialProfiles.instagram) socialProfiles.instagram = url;
          if (url.includes("facebook.com") && !socialProfiles.facebook) socialProfiles.facebook = url;
          if (url.includes("linkedin.com") && !socialProfiles.linkedin) socialProfiles.linkedin = url;
          if (url.includes("twitter.com") && !socialProfiles.twitter) socialProfiles.twitter = url;
          if (url.includes("youtube.com") && !socialProfiles.youtube) socialProfiles.youtube = url;
          if (url.includes("tiktok.com") && !socialProfiles.tiktok) socialProfiles.tiktok = url;
        });

        await db.companyKnowledge.update({
          where: { id: companyId },
          data: {
            websiteFreshness: new Date(),
            contactFreshness: new Date(),
            emails: Array.from(new Set([...(company.emails || []), ...extractedEmails])),
            phones: Array.from(new Set([...(company.phones || []), ...extractedPhones])),
            socialProfiles,
          }
        });
      } else {
        await db.companyKnowledge.update({
          where: { id: companyId },
          data: { websiteFreshness: new Date(), contactFreshness: new Date() }
        });
      }
    });

    // 2. Re-evaluate pipeline
    await step.run("evaluate-pipeline", async () => {
      await PipelineOrchestrator.evaluateAndRoute(companyId);
    });

    return { success: true };
  }
);
