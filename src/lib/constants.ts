/**
 * Shared constants extracted from dashboard UI components.
 * Single source of truth for status values, source labels, etc.
 * @module
 */

import { z } from "zod";

// ── Lead Statuses ───────────────────────────────────────

export const LEAD_STATUS_VALUES = [
  "new",
  "active",
  "warm",
  "cold",
  "closed",
] as const;

/** Zod enum for lead status validation in tRPC inputs */
export const LeadStatusEnum = z.enum(LEAD_STATUS_VALUES);

export type LeadStatusValue = (typeof LEAD_STATUS_VALUES)[number];

/** Status display config for UI badges */
export const LEAD_STATUSES = [
  { value: "new",    label: "New",    badge: "badge-primary", dot: "status-dot-new"    },
  { value: "active", label: "Active", badge: "badge-success", dot: "status-dot-active" },
  { value: "warm",   label: "Warm",   badge: "badge-warning", dot: "status-dot-warm"   },
  { value: "cold",   label: "Cold",   badge: "badge-default", dot: "status-dot-cold"   },
  { value: "closed", label: "Closed", badge: "badge-error",   dot: "status-dot-closed" },
] as const;

// ── Lead Sources ────────────────────────────────────────

export const ALL_SOURCES = [
  "linkedin",
  "instagram",
  "google_maps",
  "website",
  "github",
  "product_hunt",
  "reddit",
  "job_boards",
  "crunchbase",
  "clutch",
  "behance",
  "dribbble",
  "justdial",
  "indiamart",
  "facebook",
  "twitter_x",
] as const;

/** Human-readable labels for source badges in UI */
export const SOURCE_LABELS: Record<string, string> = {
  google_maps:  "Maps",
  linkedin:     "LinkedIn",
  instagram:    "Instagram",
  website:      "Web",
  github:       "GitHub",
  product_hunt: "PH",
  reddit:       "Reddit",
  job_boards:   "Jobs",
  crunchbase:   "CB",
  clutch:       "Clutch",
  behance:      "Behance",
  dribbble:     "Dribbble",
  justdial:     "JustDial",
  indiamart:    "IndiaMART",
  facebook:     "Facebook",
  twitter_x:    "X",
};

// ── Default Agency Services ─────────────────────────────

export const DEFAULT_AGENCY_SERVICES = [
  {
    name: "Web Redesign & Development",
    description: "Modern React/NextJS/Tailwind frontend with high performance and accessibility.",
    price: "$3,000 - $8,000",
    priority: 1,
  },
  {
    name: "SEO Audit & Optimization",
    description: "Optimize search ranking, fix web vitals, index structure, meta tags.",
    price: "$1,500 - $3,000",
    priority: 2,
  },
  {
    name: "Conversion Rate Optimization (CRO)",
    description: "Rewrite CTA funnels, build custom interactive calculators/wizards.",
    price: "$2,000 - $4,500",
    priority: 3,
  },
];
