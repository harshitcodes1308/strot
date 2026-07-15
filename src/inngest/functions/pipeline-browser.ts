import { inngest } from "../client";
import { db } from "@/lib/db";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";
import { BrowserLayer } from "@/scrapers/browser-pool";

export const pipelineBrowserRender = inngest.createFunction(
  { id: "pipeline-browser-render", retries: 1, triggers: [{ event: "pipeline/browser.render.requested" }] },
  async ({ event, step }) => {
    const { companyId } = event.data;

    const company = await step.run("fetch-company", async () => {
      return await db.companyKnowledge.findUnique({ where: { id: companyId } });
    });

    if (!company || !company.domain) return { success: false };

    // 1. Playwright Browser Rendering (Layer 7 & 8)
    await step.run("playwright-render", async () => {
      console.log(`[Pipeline] Rendering ${company.domain} with Playwright...`);
      const { browser, context } = await BrowserLayer.getContext();
      const page = await context.newPage();
      try {
        await page.goto(`https://${company.domain}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        const isCaptcha = await BrowserLayer.checkCaptcha(page);
        if (isCaptcha) {
           console.warn(`[Pipeline] Captcha detected on ${company.domain}`);
        } else {
           // MOCK: Updating the company knowledge
           await db.companyKnowledge.update({
             where: { id: companyId },
             data: {
               websiteFreshness: new Date(), // updated with browser
               description: "Browser rendering extracted further details."
             }
           });
        }
      } catch (e) {
         console.error("Browser render failed", e);
      } finally {
        await browser.close();
      }
    });

    // 2. Re-evaluate pipeline
    await step.run("evaluate-pipeline", async () => {
      await PipelineOrchestrator.evaluateAndRoute(companyId);
    });

    return { success: true };
  }
);
