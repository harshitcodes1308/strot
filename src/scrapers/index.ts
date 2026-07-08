/**
 * Scraper index — registers all Phase 1 + Phase 5 sources with the orchestrator.
 *
 * Phase 1 (live scrapers): LinkedIn, Instagram, Google Maps, Company Websites
 * Phase 5 (live where API available, documented stubs otherwise):
 *   - GitHub (GitHub Search API — works unauthenticated, enhanced with GITHUB_TOKEN)
 *   - Product Hunt (GraphQL API — requires PRODUCT_HUNT_TOKEN)
 *   - Reddit (public JSON API — no auth needed)
 *   - Job Boards (Hacker News Algolia API — no auth needed)
 *   - Crunchbase (requires CRUNCHBASE_API_KEY — manual/beta)
 *   - Clutch (manual/beta — Cloudflare blocks all automation)
 *   - Behance (manual/beta — Adobe auth required)
 *   - Dribbble (manual/beta — requires DRIBBBLE_ACCESS_TOKEN + enterprise plan)
 *   - GoodFirms (manual/beta — Cloudflare blocks all automation)
 *   - JustDial (manual/beta — Indian phone OTP required)
 *   - IndiaMART (manual/beta — requires INDIAMART_API_KEY)
 *   - Facebook (manual/beta — Meta blocks all automation)
 *   - Twitter/X (manual/beta — requires X_BEARER_TOKEN paid plan)
 *
 * To add a new source:
 *   1. Create src/scrapers/{source}.ts implementing LeadSourceScraper
 *   2. Import and register it here
 *   3. Add the source string to LeadSource type in lib/types.ts
 *   No other files change.
 */

import { orchestrator } from "./base";

// Phase 1 scrapers
import { LinkedInScraper }    from "./linkedin";
import { InstagramScraper }   from "./instagram";
import { GoogleMapsScraper }  from "./google-maps";
import { WebsiteScraper }     from "./website";
// NOTE: The following stub scrapers are intentionally NOT registered here.
// googleDorkingScraper, businessDirectoriesScraper, adLibrariesScraper all use id 'website',
// and socialPostsScraper uses id 'twitter_x'. Registering them would overwrite the real
// WebsiteScraper and TwitterXScraper in the orchestrator due to ID conflicts.

// Phase 5 scrapers — live
import { GithubScraper }      from "./github";
import { ProductHuntScraper } from "./product-hunt";
import { RedditScraper }      from "./reddit";
import { JobBoardsScraper }   from "./job-boards";

// Phase 5 scrapers — manual/beta (register so they appear in source UI as stubs)
import { CrunchbaseScraper }  from "./crunchbase";
import { ClutchScraper }      from "./clutch";
import { GoodFirmsScraper }   from "./goodfirms";
import { BehanceScraper }     from "./behance";
import { DribbbleScraper }    from "./dribbble";
import { JustDialScraper }    from "./justdial";
import { IndiaMartScraper }   from "./indiamart";
import { FacebookScraper }    from "./facebook";
import { TwitterXScraper }    from "./twitter-x";

// Register Phase 1
orchestrator.register(new LinkedInScraper());
orchestrator.register(new InstagramScraper());
orchestrator.register(new GoogleMapsScraper());
orchestrator.register(new WebsiteScraper());


// Register Phase 5 — live
orchestrator.register(new GithubScraper());
orchestrator.register(new ProductHuntScraper());
orchestrator.register(new RedditScraper());
orchestrator.register(new JobBoardsScraper());

// Register Phase 5 — stubs (return empty; log manual/beta notice)
orchestrator.register(new CrunchbaseScraper());
orchestrator.register(new ClutchScraper());
orchestrator.register(new GoodFirmsScraper());
orchestrator.register(new BehanceScraper());
orchestrator.register(new DribbbleScraper());
orchestrator.register(new JustDialScraper());
orchestrator.register(new IndiaMartScraper());
orchestrator.register(new FacebookScraper());
orchestrator.register(new TwitterXScraper());

// Re-export orchestrator and utilities
export { orchestrator }                                                 from "./base";
export { computeOpportunitySignals }                                    from "./signals";
export { detectTechStack, isBlacklisted }                               from "./website";
export { queryToHashtags }                                              from "./instagram";
export { jaroWinkler, normalizeDomain, areDuplicates, deduplicateResults } from "./base";
export type { LeadSourceScraper, BrowserConfig, ScraperOrchestrator }  from "./base";
