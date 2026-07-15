import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { runScraper } from "@/inngest/functions/run-scraper";
import { enrichLead } from "@/inngest/functions/enrich-lead";
import { deepDiscovery } from "@/inngest/functions/deep-discovery";
import { researchLead } from "@/inngest/functions/research-lead";
import { generateOutreach } from "@/inngest/functions/generate-outreach";
import { monitorClients } from "@/inngest/functions/monitor-clients";
import { pipelineWebsiteCrawl } from "@/inngest/functions/pipeline-website";
import { pipelineSocialSearch } from "@/inngest/functions/pipeline-social";
import { pipelineSearchFallback } from "@/inngest/functions/pipeline-search";
import { pipelineBrowserRender } from "@/inngest/functions/pipeline-browser";
import { v2SearchRun } from "@/inngest/functions/v2-search";

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
    pipelineWebsiteCrawl,
    pipelineSocialSearch,
    pipelineSearchFallback,
    pipelineBrowserRender,
    v2SearchRun,
  ],
});
