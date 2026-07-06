// Mock data store — Phase 1 (revised)
// Sources: LinkedIn, Instagram, Google Maps, Company Websites
// Note: This is the UI-layer mock. Real data flows from /src/scrapers/* modules.

import { Lead, Folder, SearchResult, LeadSource } from "./types";

export const MOCK_FOLDERS: Folder[] = [
  { id: "f1", name: "SaaS Prospects",   color: "oklch(0.55 0.095 180)", leadCount: 12 },
  { id: "f2", name: "Agency Targets",    color: "oklch(0.74 0.080 161)", leadCount: 8  },
  { id: "f3", name: "Local Businesses",  color: "oklch(0.65 0.140 38)",  leadCount: 19 },
  { id: "f4", name: "Ecom & Retail",     color: "oklch(0.72 0.120 72)",  leadCount: 6  },
];

export const MOCK_LEADS: Lead[] = [
  {
    id: "l1",
    name: "Meridian Studio",
    domain: "meridianstudio.io",
    description: "Architecture and interior design firm in NYC. Strong LinkedIn presence but weak website — no portfolio CMS, no contact form, no analytics.",
    source: "linkedin",
    sources: ["linkedin", "google_maps", "website"],
    status: "active",
    tags: ["Architecture", "Agency", "NYC", "Website Gap"],
    industry: "Architecture",
    employees: "10–50",
    location: "New York, NY",
    linkedin: {
      followers: 3400,
      employees: "11–50",
      headquarters: "New York, NY",
      industry: "Architecture & Planning",
      foundedYear: 2015,
      specialties: ["Interior Design", "Commercial", "Residential"],
      recentPosts: 12,
    },
    google: {
      rating: 4.7,
      reviewCount: 47,
      category: "Architecture Firm",
      address: "100 Park Ave, New York, NY",
      phone: "+1 212-555-0101",
      claimedListing: true,
    },
    website: {
      techStack: ["WordPress", "Elementor"],
      hasAnalytics: false,
      hasCMS: true,
      hasEcommerce: false,
      performanceScore: 38,
      mobileScore: 42,
      hasSSL: true,
      cms: "WordPress",
    },
    opportunitySignals: ["Poor website performance", "No analytics detected", "Strong social, weak web"],
    savedAt: new Date("2025-07-01"),
    folderId: "f2",
  },
  {
    id: "l2",
    name: "Brew & Grind Coffee",
    domain: "brewandgrind.co",
    description: "Specialty coffee roaster in Portland. 4.8★ on Maps, 8k Instagram followers, but no e-commerce and dated website.",
    source: "google_maps",
    sources: ["google_maps", "instagram", "website"],
    status: "warm",
    tags: ["Local", "Coffee", "SMB", "Instagram Active"],
    location: "Portland, OR",
    industry: "Food & Beverage",
    google: {
      rating: 4.8,
      reviewCount: 312,
      category: "Coffee Roaster",
      address: "2340 NW Westover Rd, Portland, OR",
      phone: "+1 503-555-0177",
      claimedListing: true,
    },
    instagram: {
      handle: "@brewandgrind",
      followers: 8200,
      following: 342,
      posts: 480,
      avgLikes: 310,
      engagementRate: 3.8,
      lastPosted: "2025-06-30",
      bio: "Specialty single-origin roasts. Portland, OR ☕",
    },
    website: {
      techStack: ["Squarespace"],
      hasAnalytics: true,
      hasCMS: true,
      hasEcommerce: false,
      performanceScore: 61,
      mobileScore: 58,
      hasSSL: true,
      cms: "Squarespace",
    },
    opportunitySignals: ["No e-commerce despite strong brand", "High review velocity", "Instagram audience untapped"],
    savedAt: new Date("2025-07-02"),
    folderId: "f3",
  },
  {
    id: "l3",
    name: "Coastal Ventures",
    domain: "coastalventures.vc",
    description: "Early-stage VC firm. LinkedIn-active, no Instagram, thin website with no contact form or portfolio page.",
    source: "linkedin",
    sources: ["linkedin", "website"],
    status: "new",
    tags: ["VC", "Finance", "SF", "Thin Web"],
    location: "San Francisco, CA",
    industry: "Venture Capital",
    employees: "5–15",
    linkedin: {
      followers: 1800,
      employees: "2–10",
      headquarters: "San Francisco, CA",
      industry: "Venture Capital & Private Equity",
      foundedYear: 2019,
      recentPosts: 4,
    },
    website: {
      techStack: ["Webflow"],
      hasAnalytics: false,
      hasCMS: true,
      hasEcommerce: false,
      performanceScore: 72,
      mobileScore: 68,
      hasSSL: true,
      cms: "Webflow",
    },
    opportunitySignals: ["No contact form", "No analytics", "Low post activity signal"],
    savedAt: new Date("2025-07-03"),
    folderId: "f2",
  },
  {
    id: "l4",
    name: "Sonder Apparel",
    domain: "sonderapparel.com",
    description: "Sustainable fashion brand. 22k Instagram followers, high engagement, selling via Linktree — no proper storefront.",
    source: "instagram",
    sources: ["instagram", "website"],
    status: "warm",
    tags: ["Fashion", "Ecommerce", "DTC", "Instagram Native"],
    industry: "Apparel & Fashion",
    instagram: {
      handle: "@sonderapparel",
      followers: 22400,
      following: 1200,
      posts: 910,
      avgLikes: 980,
      engagementRate: 4.4,
      lastPosted: "2025-07-01",
      bio: "Slow fashion. Sustainable fabrics. 🌿 Shop via link.",
    },
    website: {
      techStack: ["Linktree"],
      hasAnalytics: false,
      hasCMS: false,
      hasEcommerce: false,
      performanceScore: 0,
      mobileScore: 0,
      hasSSL: true,
    },
    opportunitySignals: ["Selling via Linktree — no storefront", "22k IG audience with no conversion layer", "High engagement rate"],
    savedAt: new Date("2025-07-04"),
    folderId: "f4",
  },
  {
    id: "l5",
    name: "Vela Design Studio",
    domain: "veladesign.co",
    description: "Brand and packaging design studio. Active Instagram portfolio, LinkedIn company page, but website has no booking or inquiry flow.",
    source: "instagram",
    sources: ["instagram", "linkedin", "website"],
    status: "active",
    tags: ["Design", "Branding", "Agency", "Portfolio Gap"],
    industry: "Design Services",
    employees: "2–10",
    instagram: {
      handle: "@veladesignstudio",
      followers: 5600,
      following: 780,
      posts: 340,
      avgLikes: 420,
      engagementRate: 7.5,
      lastPosted: "2025-06-29",
      bio: "Brand & packaging design. DM to inquire.",
    },
    linkedin: {
      followers: 920,
      employees: "2–10",
      industry: "Graphic Design",
      foundedYear: 2020,
      recentPosts: 6,
    },
    website: {
      techStack: ["Cargo Collective"],
      hasAnalytics: false,
      hasCMS: true,
      hasEcommerce: false,
      performanceScore: 55,
      mobileScore: 49,
      hasSSL: true,
    },
    opportunitySignals: ["No inquiry form — DMs only", "High IG engagement rate", "No contact CTA on website"],
    savedAt: new Date("2025-07-05"),
    folderId: "f2",
  },
  {
    id: "l6",
    name: "Oak & Stone Roasters",
    domain: "oakstone.coffee",
    description: "Specialty single-origin roaster in Austin. Top-rated on Maps, active local Instagram, no online ordering, outdated website.",
    source: "google_maps",
    sources: ["google_maps", "instagram"],
    status: "new",
    tags: ["Local", "Coffee", "Austin", "No E-comm"],
    location: "Austin, TX",
    industry: "Food & Beverage",
    google: {
      rating: 4.9,
      reviewCount: 528,
      category: "Coffee Roaster",
      address: "1800 S Congress Ave, Austin, TX",
      phone: "+1 512-555-0133",
      claimedListing: true,
    },
    instagram: {
      handle: "@oakstoneroasters",
      followers: 4100,
      following: 210,
      posts: 290,
      avgLikes: 190,
      engagementRate: 4.6,
      lastPosted: "2025-07-02",
    },
    opportunitySignals: ["4.9★ but no online ordering", "Strong local following", "No website"],
    savedAt: new Date("2025-07-05"),
    folderId: "f3",
  },
];

// Search simulation — merges results across the 4 Phase 1 scraper sources
// In production this calls /api/trpc/search which orchestrates the scraper modules
export function simulateSearch(
  query: string,
  location: string,
  industry: string,
  sources: LeadSource[]
): SearchResult[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase();

  const POOL: SearchResult[] = [
    {
      id: "sr1",
      name: "Tandem Architecture",
      domain: "tandemarch.com",
      description: "Architecture firm specializing in adaptive reuse projects. Active LinkedIn, Google Maps listed, thin website — no portfolio or CTA.",
      source: "linkedin",
      sources: ["linkedin", "google_maps", "website"],
      location: "Chicago, IL",
      industry: "Architecture",
      employees: "10–50",
      linkedin: { followers: 2100, employees: "11–50", industry: "Architecture", recentPosts: 8 },
      google: { rating: 4.6, reviewCount: 28, category: "Architecture Firm", address: "200 W Madison St, Chicago, IL" },
      website: { techStack: ["WordPress"], performanceScore: 44, hasAnalytics: false, hasSSL: true, cms: "WordPress" },
      opportunitySignals: ["No portfolio CMS", "No analytics", "LinkedIn active but no web conversion"],
      isSaved: false,
    },
    {
      id: "sr2",
      name: "Mosaic Coffee Bar",
      domain: "mosaiccoffeebar.com",
      description: "Third-wave coffee bar with high review count and strong Instagram aesthetic, but selling nothing online.",
      source: "google_maps",
      sources: ["google_maps", "instagram"],
      location: "Seattle, WA",
      industry: "Food & Beverage",
      google: { rating: 4.8, reviewCount: 744, category: "Coffee Shop", address: "500 Pine St, Seattle, WA" },
      instagram: { handle: "@mosaiccoffeebar", followers: 13200, posts: 620, avgLikes: 540, engagementRate: 4.1, lastPosted: "2025-07-03" },
      opportunitySignals: ["13k Instagram followers, zero e-commerce", "High review velocity"],
      isSaved: false,
    },
    {
      id: "sr3",
      name: "Forma Studio",
      domain: "formastudio.co",
      description: "Industrial and product design studio. 18k Instagram followers, DM-only inquiries. No website to speak of.",
      source: "instagram",
      sources: ["instagram"],
      industry: "Design Services",
      employees: "2–10",
      instagram: { handle: "@formastudioco", followers: 18700, posts: 1200, avgLikes: 820, engagementRate: 4.4, lastPosted: "2025-07-04", bio: "Industrial design. DM for inquiries." },
      opportunitySignals: ["18k followers, DM-only intake", "No website detected"],
      isSaved: false,
    },
    {
      id: "sr4",
      name: "Harvest Digital Agency",
      domain: "harvestdigital.agency",
      description: "Digital marketing agency. LinkedIn company page with 4k followers. Website exists but has no case studies, no pricing, no CTA.",
      source: "linkedin",
      sources: ["linkedin", "website"],
      location: "London, UK",
      industry: "Marketing & Advertising",
      employees: "10–50",
      linkedin: { followers: 4100, employees: "11–50", headquarters: "London, UK", industry: "Marketing & Advertising", foundedYear: 2017, recentPosts: 14 },
      website: { techStack: ["HubSpot CMS"], hasAnalytics: true, hasCMS: true, performanceScore: 58, mobileScore: 62, hasSSL: true, cms: "HubSpot" },
      opportunitySignals: ["No case studies page", "No pricing", "No primary CTA above fold"],
      isSaved: false,
    },
    {
      id: "sr5",
      name: "Altitude Brewing Co.",
      domain: "altitudebrewing.beer",
      description: "Craft brewery with taproom in Denver. 4.7★ on Maps, active Instagram. Shopify store exists but no SEO and 28 Perf score.",
      source: "google_maps",
      sources: ["google_maps", "instagram", "website"],
      location: "Denver, CO",
      industry: "Food & Beverage",
      google: { rating: 4.7, reviewCount: 392, category: "Brewery", address: "3400 Blake St, Denver, CO" },
      instagram: { handle: "@altitudebrewing", followers: 9800, posts: 510, avgLikes: 380, engagementRate: 3.9 },
      website: { techStack: ["Shopify"], hasEcommerce: true, performanceScore: 28, mobileScore: 31, hasAnalytics: true, hasSSL: true, cms: "Shopify" },
      opportunitySignals: ["Shopify present but performance score 28", "No SEO structure", "High review count"],
      isSaved: false,
    },
    {
      id: "sr6",
      name: "Lumen Interiors",
      domain: "lumeninteriors.com",
      description: "Luxury interior design firm. Pinterest-heavy, low LinkedIn presence, website is a single-pager with no booking.",
      source: "website",
      sources: ["website", "instagram"],
      industry: "Interior Design",
      instagram: { handle: "@lumeninteriors", followers: 31000, posts: 780, avgLikes: 1400, engagementRate: 4.5, bio: "Luxury interiors. Inquire via email." },
      website: { techStack: ["Squarespace"], hasAnalytics: false, hasCMS: true, performanceScore: 66, mobileScore: 71, hasSSL: true, cms: "Squarespace" },
      opportunitySignals: ["31k followers, email-only intake", "Single page site — no booking", "No analytics"],
      isSaved: false,
    },
    // Inject saved leads back into pool so search surfaces them too
    ...MOCK_LEADS.map(l => ({
      id: l.id,
      name: l.name,
      domain: l.domain,
      description: l.description,
      source: l.source,
      sources: l.sources,
      location: l.location,
      industry: l.industry,
      employees: l.employees,
      linkedin: l.linkedin,
      instagram: l.instagram,
      google: l.google,
      website: l.website,
      opportunitySignals: l.opportunitySignals,
      isSaved: true,
    })),
  ];

  return POOL.filter(r => {
    const matchesQuery =
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.industry?.toLowerCase().includes(q) ?? false) ||
      r.domain.toLowerCase().includes(q) ||
      (r.opportunitySignals?.some(s => s.toLowerCase().includes(q)) ?? false);

    const matchesLocation = !location ||
      r.location?.toLowerCase().includes(location.toLowerCase());

    const matchesIndustry = !industry ||
      r.industry?.toLowerCase().includes(industry.toLowerCase());

    const matchesSources = sources.length === 0 ||
      r.sources.some(s => sources.includes(s));

    return matchesQuery && matchesLocation && matchesIndustry && matchesSources;
  });
}

// CSV export
export function leadsToCSV(leads: Lead[]): string {
  const headers = [
    "Name", "Domain", "Industry", "Status", "Tags", "Location",
    "Sources", "LinkedIn Followers", "Instagram Followers", "Google Rating",
    "Google Reviews", "Website Performance", "Opportunity Signals", "Saved At",
  ];

  const rows = leads.map(l => [
    l.name,
    l.domain,
    l.industry ?? "",
    l.status,
    l.tags.join("; "),
    l.location ?? "",
    l.sources.join("; "),
    l.linkedin?.followers?.toString() ?? "",
    l.instagram?.followers?.toString() ?? "",
    l.google?.rating?.toString() ?? "",
    l.google?.reviewCount?.toString() ?? "",
    l.website?.performanceScore?.toString() ?? "",
    (l.opportunitySignals ?? []).join("; "),
    l.savedAt.toISOString().split("T")[0],
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadCSV(leads: Lead[], filename = "strot-leads.csv") {
  const csv = leadsToCSV(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
