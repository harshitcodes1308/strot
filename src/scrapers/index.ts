/**
 * Scraper index — registers all Phase 1 sources with the orchestrator
 *
 * Phase 1 sources: LinkedIn, Instagram, Google Maps, Company Websites
 *
 * To add a Phase 5 source (GitHub, Product Hunt, Crunchbase, etc.):
 *   1. Create src/scrapers/{source}.ts implementing LeadSourceScraper
 *   2. Import and register it here
 *   3. Add the new LeadSource value to types.ts
 *   No other files change.
 */

import { orchestrator } from "./base";
import { LinkedInScraper } from "./linkedin";
import { InstagramScraper } from "./instagram";
import { GoogleMapsScraper } from "./google-maps";
import { WebsiteScraper } from "./website";

// Register all Phase 1 scrapers
orchestrator.register(new LinkedInScraper());
orchestrator.register(new InstagramScraper());
orchestrator.register(new GoogleMapsScraper());
orchestrator.register(new WebsiteScraper());

// Re-export orchestrator and utilities
export { orchestrator } from "./base";
export { computeOpportunitySignals } from "./signals";
export { detectTechStack, isBlacklisted } from "./website";
export { queryToHashtags } from "./instagram";
export { jaroWinkler, normalizeDomain, areDuplicates, deduplicateResults } from "./base";
export type { LeadSourceScraper, BrowserConfig, ScraperOrchestrator } from "./base";
