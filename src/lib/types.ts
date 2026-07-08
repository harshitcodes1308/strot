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
  workspaceId: string;
  
  // Identity
  name: string;
  domain: string | null;
  description: string | null;
  avatar: string | null;
  
  // Source tracking
  source: LeadSource;
  sourceUrl: string;
  profileUrl: string | null;
  socialProfiles?: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    github?: string;
    youtube?: string;
    tiktok?: string;
  };
  sources: LeadSource[];
  
  // Contact
  emails: string[];
  phones: string[];
  contactSources?: {
    email: string;
    foundOn: string;
    confidence: 'high' | 'medium' | 'low';
  }[];
  
  // Business
  location: string | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  } | null;
  industry: string | null;
  employeeCount: string | null;
  foundedYear: number | null;
  revenue: string | null;
  
  // Owner
  ownerName: string | null;
  ownerTitle: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerLinkedIn: string | null;
  
  // Social metrics
  followers: number | null;
  following: number | null;
  engagement: number | null;
  postCount: number | null;
  lastPostDate: Date | null;
  
  // Review & reputation
  rating: number | null;
  reviewCount: number | null;
  
  // Technical
  techStack: string[];
  hasWebsite: boolean;
  websiteStatus: 'live' | 'down' | 'redirect' | 'parked' | null;
  
  // Per-source enrichment data (Legacy/Raw)
  linkedin?: LinkedInData;
  instagram?: InstagramData;
  google?: GoogleMapsData;
  website?: WebsiteData;
  
  // Opportunity
  opportunitySignals?: string[];
  buyingSignals?: string[];
  opportunityScore: number | null;
  matchScore: number | null;
  postmortem?: any;
  audit?: any;
  
  // Ads
  isRunningAds: boolean;
  adPlatforms: string[];
  adCount: number | null;
  
  // Dashboard state
  status: LeadStatus;
  notes?: string;
  folderId?: string;
  assignedToId?: string;
  
  // Meta
  dataCompleteness: number;
  scrapedAt: Date;
  enrichedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  domain: string | null;
  description: string | null;
  avatar: string | null;
  source: LeadSource;
  sourceUrl: string;
  profileUrl: string | null;
  socialProfiles?: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    github?: string;
    youtube?: string;
    tiktok?: string;
  };
  sources: LeadSource[];
  emails: string[];
  phones: string[];
  location: string | null;
  industry: string | null;
  employeeCount: string | null;
  foundedYear: number | null;
  followers: number | null;
  engagement: number | null;
  rating: number | null;
  reviewCount: number | null;
  techStack: string[];
  hasWebsite: boolean;
  isRunningAds: boolean;
  dataCompleteness: number;
  
  // Legacy payload
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
  raw?: Record<string, unknown>;
  [key: string]: any;
}

export interface NormalizedLead {
  id?: string;
  name: string;
  domain?: string | null;
  description?: string;
  location?: string | null;
  industry?: string | null;
  employees?: string;
  sources?: string[];
  opportunitySignals?: string[];
  sourceData: any;
}
