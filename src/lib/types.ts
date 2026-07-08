// Lead types for Phase 1 — updated per PRD revision
// Sources: LinkedIn, Instagram, Google Maps, Company Websites (scraper-based)
// GitHub, Product Hunt, etc. → Phase 5 expansion

export type LeadSource =
  // Phase 1 sources (live scrapers)
  | "linkedin"
  | "instagram"
  | "google_maps"
  | "website"
  // Phase 5 sources (live where API available, documented stubs otherwise)
  | "github"
  | "product_hunt"
  | "reddit"
  | "job_boards"
  | "crunchbase"
  | "clutch"
  | "behance"
  | "dribbble"
  | "justdial"
  | "indiamart"
  | "facebook"
  | "twitter_x";

// Phase 5 sources (not active in Phase 1 UI — kept for backward compat)
export type Phase5Source = "github" | "product_hunt" | "facebook" | "twitter_x" | "reddit" | "clutch" | "goodfirms" | "crunchbase" | "behance" | "dribbble" | "justdial" | "indiamart" | "job_boards";

export type AnySource = LeadSource;

export type LeadStatus = "new" | "active" | "warm" | "cold" | "closed";

export interface LinkedInData {
  followers?: number;
  employees?: string;       // "11-50", "51-200", etc.
  headquarters?: string;
  industry?: string;
  foundedYear?: number;
  specialties?: string[];
  recentPosts?: number;     // post activity signal
}

export interface InstagramData {
  handle?: string;
  followers?: number;
  following?: number;
  posts?: number;
  avgLikes?: number;
  engagementRate?: number;  // %
  lastPosted?: string;      // ISO date
  bio?: string;
}

export interface GoogleMapsData {
  placeId?: string;
  rating: number;
  reviewCount: number;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: string;
  claimedListing?: boolean;
}

export interface WebsiteData {
  techStack?: string[];     // detected via Wappalyzer-style detection
  hasAnalytics?: boolean;
  hasCMS?: boolean;
  hasEcommerce?: boolean;
  performanceScore?: number; // 0–100 Lighthouse
  mobileScore?: number;
  lastUpdated?: string;     // ISO date, estimated from sitemap/last-modified
  hasSSL?: boolean;
  cms?: string;             // WordPress, Webflow, etc.
}

export interface Lead {
  id: string;
  name: string;
  domain: string;
  description: string;
  source: LeadSource;          // primary source (first found)
  sources: LeadSource[];       // all sources this lead was found on (merged)
  status: LeadStatus;
  tags: string[];
  location?: string;
  industry?: string;
  employees?: string;
  foundedYear?: number;

  // Per-source enrichment data
  linkedin?: LinkedInData;
  instagram?: InstagramData;
  google?: GoogleMapsData;
  website?: WebsiteData;

  // Opportunity signals (set on save, computed from enrichment)
  opportunitySignals?: string[];

  notes?: string;
  savedAt: Date;
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  leadCount: number;
}

export interface SearchResult {
  id: string;
  name: string;
  domain: string;
  description: string;
  source: LeadSource;
  sources: LeadSource[];
  location?: string;
  industry?: string;
  employees?: string;
  linkedin?: LinkedInData;
  instagram?: InstagramData;
  google?: GoogleMapsData;
  website?: WebsiteData;
  opportunitySignals?: string[];
  isSaved: boolean;
}

export interface SearchFilters {
  query: string;
  location: string;
  industry: string;
  sources: LeadSource[];
}

// Common LeadSource scraper interface (backend)
// Each scraper module (linkedin.ts, instagram.ts, google-maps.ts, website.ts)
// implements this interface so adding a Phase 5 source never touches core logic.
export interface LeadSourceModule {
  id: LeadSource;
  label: string;
  fetch(params: ScraperParams): Promise<RawLeadData[]>;
  parse(raw: RawLeadData): NormalizedLead;
  normalize(lead: NormalizedLead): SearchResult;
}

export interface ScraperParams {
  query: string;
  location?: string;
  industry?: string;
  limit?: number;
}

export interface RawLeadData {
  sourceId: LeadSource;
  raw: Record<string, unknown>;
}

export interface NormalizedLead {
  name: string;
  domain?: string;
  description?: string;
  location?: string;
  industry?: string;
  employees?: string;
  sources?: string[];
  opportunitySignals?: string[];
  // Phase 1 sources use typed keys; Phase 5 sources add their own keys
  sourceData: Partial<Pick<Lead, "linkedin" | "instagram" | "google" | "website">> & Record<string, unknown>;
}
