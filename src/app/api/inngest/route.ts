import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { runScraper } from "@/inngest/functions/run-scraper";
import { enrichLead } from "@/inngest/functions/enrich-lead";
import { deepDiscovery } from "@/inngest/functions/deep-discovery";
import { researchLead } from "@/inngest/functions/research-lead";
import { generateOutreach } from "@/inngest/functions/generate-outreach";
import { monitorClients } from "@/inngest/functions/monitor-clients";

// Create an API that serves zero-config background jobs
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    runScraper,
    enrichLead,
    deepDiscovery,
    researchLead,
    generateOutreach,
    monitorClients,
  ],
});
