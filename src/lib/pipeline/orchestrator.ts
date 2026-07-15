import { evaluateCompanyConfidence } from "./confidence";
import { db } from "@/lib/db";

export class PipelineOrchestrator {
  /**
   * Evaluates the current state of a lead and triggers the appropriate next steps in the pipeline.
   * Follows a strict order of investigation and only halts when 100% complete or all options exhausted.
   * Returns true if the pipeline has reached 100% completeness or exhausted options and should stop.
   */
  static async evaluateAndRoute(companyId: string): Promise<boolean> {
    const company = await db.companyKnowledge.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    const evaluation = evaluateCompanyConfidence(company);

    console.log(`[Pipeline] Company ${company.domain || company.name} at completeness ${evaluation.completeness}%.`);
    
    if (evaluation.isComplete) {
      console.log(`[Pipeline] Company ${company.domain || company.name} has 100% completeness. Halting pipeline.`);
      return true;
    }

    if (evaluation.missingFields.length > 0) {
      console.log(`[Pipeline] Missing fields: ${evaluation.missingFields.join(', ')}`);
    }

    // Dynamic routing imports
    const { inngest } = await import("@/inngest/client");

    // Strategy 1: Google Business
    // If we don't have location/maps URL/phone and haven't tried google recently
    if (evaluation.needsGoogleBusiness) {
      console.log(`[Pipeline] Routing to Google Business Search...`);
      await inngest.send({
        name: "pipeline/search.fallback.requested", // Can repurpose this or rename
        data: { companyId: company.id }
      });
      return false; 
    }

    // Strategy 2: Base Website Crawl
    if (evaluation.needsWebsiteCrawl) {
      console.log(`[Pipeline] Routing to Website Crawler...`);
      await inngest.send({
        name: "pipeline/website.crawl.requested",
        data: { companyId: company.id }
      });
      return false;
    }

    // Strategy 3: Deep Contact/About page Crawl
    if (evaluation.needsContactCrawl) {
      console.log(`[Pipeline] Routing to Deep Website Crawler (Contacts/About)...`);
      await inngest.send({
        name: "pipeline/website.crawl.requested", // The website crawler will handle deep crawl internally
        data: { companyId: company.id, deepCrawl: true }
      });
      return false;
    }

    // Strategy 4: Social / Email SERP search
    if (evaluation.needsSocialSearch || evaluation.needsEmailDiscovery) {
      console.log(`[Pipeline] Routing to Iterative SERP / Social Search...`);
      await inngest.send({
        name: "pipeline/social.search.requested",
        data: { companyId: company.id }
      });
      return false;
    }

    // If we reach here, we have exhausted all strategies but still aren't 100% complete
    console.log(`[Pipeline] Exhausted all strategies for ${company.domain || company.name}. Completeness: ${evaluation.completeness}%. Halting.`);
    
    // Update the company to mark exhaustion
    await db.companyKnowledge.update({
      where: { id: company.id },
      data: {
        lastEnrichedAt: new Date(),
      }
    });

    return true;
  }
}
