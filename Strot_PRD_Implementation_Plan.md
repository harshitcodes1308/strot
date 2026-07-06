# Strot — Product Requirements Document & Implementation Plan (V1)

> **⚠️ READ THIS FIRST — INSTRUCTIONS FOR THE AI CODING AGENT (Antigravity / Claude Code / Cursor)**
>
> This document **is already the implementation plan**. It is not a brainstorm, not a draft, and not something you need to re-plan, restructure, or "improve" before starting.
>
> 1. **Do not create a new plan.** Do not generate your own roadmap, phase breakdown, or task list. Use the phases below exactly as written.
> 2. **Start immediately with Phase 1, Task 1.** Do not ask for a plan review before beginning implementation.
> 3. **Work sequentially.** Do not touch, scaffold, or write code for Phase 2 (or beyond) until every item in Phase 1's "Definition of Done" checklist is complete, tested, and working end-to-end.
> 4. **At the end of each phase**, stop and produce a short summary of what was built + confirm the Definition of Done checklist against actual working code. Only then move to the next phase.
> 5. If something in a later phase depends on a decision not yet made in the current phase, flag it — do not silently jump ahead to resolve it.
> 6. If ambiguity comes up, make the most reasonable assumption, note it inline in code comments or a `DECISIONS.md` file, and keep moving. Do not stop and wait unless truly blocked.

---

## 1. Core Positioning

Strot is an AI-powered client intelligence platform for freelancers and agencies. It helps users discover prospects from anywhere, deeply understand their business, uncover real opportunities, and organize everything in one workspace — before they ever send an outreach message.

## 2. V1 Goals

- Ship a working core loop: **search → discover leads → understand the business → know why to contact them → save & organize → generate outreach**.
- Every phase should produce something demoable and usable, not just backend plumbing.
- Prioritize the features that make Strot's core USP (Universal Lead Discovery + Opportunity Detection) real before building agency/team-management layers on top.

## 3. Out of Scope for V1 (parked for V2+, per original feature list)

Local business heatmaps, competitor intelligence dashboard, white-label agency reports, AI proposal generator, public API & integrations, public agency marketplace, fully automated monitoring alert infra, custom AI agents per niche. These are **not** to be built in V1 — do not scaffold for them.

## 4. Assumed Tech Stack

(Consistent with Harshit's usual stack across Saviours AI / Mirayaa — adjust only if the IDE session specifies otherwise.)

- **Frontend:** Next.js 15 (App Router), Tailwind, shadcn/ui
- **API layer:** tRPC
- **DB/ORM:** Neon PostgreSQL + Prisma
- **Auth:** Clerk or NextAuth (pick one at Phase 1 kickoff and lock it in — don't switch later)
- **AI:** GPT-4o-mini for research/summarization/personalization; upgrade specific calls to a stronger model only where quality clearly demands it (e.g. Company Postmortem synthesis)
- **Background jobs / scraping orchestration:** queue-based worker (e.g. Inngest, Trigger.dev, or a simple cron+queue on Vercel/Neon) — needed for Postmortem generation, website audits, monitoring
- **Chrome Extension:** Manifest V3, talks to the same tRPC API
- **Hosting:** Vercel (app) + Neon (DB)
- **Lead sourcing:** custom scrapers (Playwright/Puppeteer headless browser + rotating proxies + rate limiting + retry/backoff) built per source, covering LinkedIn, Instagram, Google Maps, Facebook, X, Reddit, Clutch, GoodFirms, JustDial, IndiaMART, Product Hunt, Crunchbase, Behance, Dribbble, GitHub, Company Websites, Job Boards. Every source is its own module implementing a common `LeadSource` interface (`fetch → parse → normalize → dedupe`), so adding a new source never touches core search logic. Use an official API instead of scraping only where one exists and is clearly faster/cheaper for equivalent data (e.g. GitHub API, Product Hunt API) — default is scraping.

## 5. High-Level Data Model (starting point — refine as needed)

`User`, `Workspace`, `TeamMember`, `Lead`, `Company`, `Tag`, `Folder`, `Note`, `Attachment`, `Task`, `ActivityLog`, `OpportunityScore`, `Postmortem`, `WebsiteAudit`, `OutreachDraft`, `Proposal`, `AgencyProfile`, `TimelineEvent`, `ReviewSnapshot`, `MonitorAlert`.

Keep `Company` and `Lead` separate: a `Company` is the researched entity; a `Lead` is that company saved into a specific workspace with status/tags/notes attached.

---

## 6. Phase Overview

| Phase | Theme | Key Features (from feature list) |
|---|---|---|
| 1 | Core Foundation + Universal Lead Discovery MVP | #1 (partial), #8, #18 |
| 2 | AI Research & Opportunity Engine | #4, #5, #6, #9, #17 |
| 3 | Outreach, Chrome Extension & Meeting Prep | #2, #7, #13, #16 |
| 4 | Agency & Team Layer | #11, #12, #14, #15, #19 |
| 5 | Monitoring, Full Discovery & Analytics | #3, #10, #20, harden #1 |

---

## PHASE 1 — Core Foundation & Universal Lead Discovery MVP

**Objective:** A user can sign up, search for businesses across 3–4 initial sources, see results in one unified list, save them as leads, and organize them in a basic dashboard.

**Build:**
- Auth + workspace creation (single workspace per user for now, multi-team comes in Phase 4)
- Universal Lead Discovery, MVP scope — start with these sources only: **Google Maps/Google Business Profile, Company Websites, LinkedIn, Instagram**. Build each as a scraper module behind the common `LeadSource` interface (fetch → parse → normalize → dedupe). (Reasoning: these are the highest-value sources for agency/freelancer prospecting — prove the "one search, multiple sources" concept on them first; remaining sources get added in Phase 5 using the same interface, so the pipeline scales without rework.)
- Search by keyword, location, industry
- Merge duplicate leads (basic: match on domain/name similarity)
- Lead Management Dashboard basics: saved leads, tags, folders, notes, status
- Universal Search (basic): search across saved leads/companies by name, domain, tag
- Export to CSV

**Definition of Done (must all be true before Phase 2 starts):**
- [ ] User can sign up/log in and land in a workspace
- [ ] User can run one search and get merged, de-duplicated results from all 4 MVP sources
- [ ] User can save a result as a Lead with one click
- [ ] Dashboard shows saved leads with tags/folders/notes/status, fully CRUD
- [ ] Basic universal search returns correct results across saved leads
- [ ] CSV export works
- [ ] `DECISIONS.md` created and contains the auth choice + any assumptions made

🛑 **Do not begin Phase 2 until every box above is checked and demoed working.**

---

## PHASE 2 — AI Research & Opportunity Engine

**Objective:** Given a saved lead, generate a full business analysis and a reason-to-contact score automatically.

**Build:**
- **Company Postmortem** (#4): overview, founders/key people, website analysis, tech stack detection, SEO summary, social presence, competitor overview, recent news, hiring activity, growth indicators, AI recommendations — generated async via background job, cached on the `Company` record
- **Website Intelligence & Audit** (#5): performance, SEO, accessibility, Core Web Vitals, broken links, mobile responsiveness, SSL, analytics detection, CTA/forms/image optimization checks — use Lighthouse/PageSpeed API + custom crawlers
- **Opportunity Detection Engine** (#6): rules + AI layer producing Opportunity Score, Confidence Score, Priority Level, and suggested services, based on the audit + postmortem outputs
- **Google Business & Review Intelligence** (#9): pull Google ratings/reviews, sentiment analysis, complaint themes, AI summary, improvement suggestions
- **AI Buying Signals** (#17): surface signals (hiring, funding, redesign, traffic/SEO decline) detected from the above data sources, shown as tags on the Lead

**Definition of Done:**
- [ ] Clicking "Research" on any saved lead produces a full Postmortem within a reasonable async time window, with a visible loading/progress state
- [ ] Website audit returns real, correct scores against 5+ test sites
- [ ] Every researched lead shows an Opportunity Score + Confidence + Priority + suggested services, with reasoning text
- [ ] Google review intelligence works for any lead with a Google Business listing
- [ ] Buying signal tags appear correctly on leads where data supports them

🛑 **Do not begin Phase 3 until every box above is checked and demoed working.**

---

## PHASE 3 — Outreach, Chrome Extension & Meeting Prep

**Objective:** Turn research into action — generate outreach, capture leads while browsing, and prep for meetings.

**Build:**
- **AI Personalization Engine** (#7): generate cold emails, LinkedIn messages, Instagram DMs, proposal intros, meeting openers, and Loom/video scripts — all grounded in the Postmortem + Opportunity data from Phase 2
- **Chrome Extension** (#2): supported platforms for MVP extension — LinkedIn, Instagram, Google Maps, Company Websites (align with what's technically/legally extractable client-side vs. server scraping). Extract business details/contact info where publicly visible, AI summary, opportunity score preview, one-click "Add to Dashboard"
- **Company Timeline** (#13): chronological event log per company (funding, hiring, redesign, launches, review changes, leadership changes) built from data already being collected in Phase 2
- **AI Meeting Assistant** (#16): company briefing, founder research, agenda, questions to ask, pain points, competitor insights, suggested services, discussion summary — assembled from existing research, not new data collection

**Definition of Done:**
- [ ] User can generate at least 3 outreach formats (email, LinkedIn msg, IG DM) from a single lead, editable before sending
- [ ] Chrome extension installs, authenticates against the same account, and can add a lead to the dashboard from at least 2 supported platforms
- [ ] Timeline view renders real chronological events for a researched company
- [ ] Meeting Assistant produces a complete briefing doc for any lead with existing research

🛑 **Do not begin Phase 4 until every box above is checked and demoed working.**

---

## PHASE 4 — Agency & Team Layer

**Objective:** Make Strot usable by agencies/teams, not just solo operators, and let outbound matching work both ways.

**Build:**
- **Team Workspace** (#14): shared leads, shared notes, internal comments, ownership assignment, activity logs, permissions
- **Agency Profile & Portfolio** (#11): public profile with services, portfolio, case studies, industries served, testimonials, certifications, pricing model, team, tech, contact info
- **Proposal Workspace** (#15): scope, deliverables, budget, timeline, notes, attachments, requirements, internal approvals
- **AI Smart Match** (#12): match agency profile (services/industry/budget/geo/experience) against the lead pool to surface best-fit opportunities
- **AI Service Recommendations** (#19): auto-suggest which services to pitch to a given lead, with reasoning + priority, building on Opportunity Detection from Phase 2

**Definition of Done:**
- [ ] Multiple users can be invited into one workspace with distinct permission levels
- [ ] Agency profile is publicly viewable at a shareable URL
- [ ] Proposal Workspace can be created from a lead and tracks all required fields end-to-end
- [ ] Smart Match returns ranked lead recommendations based on a filled-out agency profile
- [ ] Service recommendations appear on leads with clear reasoning

🛑 **Do not begin Phase 5 until every box above is checked and demoed working.**

---

## PHASE 5 — Monitoring, Full Discovery Expansion & Analytics

**Objective:** Close the loop — expand lead sourcing to the remaining platforms, add ongoing client monitoring, add proactive discovery, and roll everything up into an analytics view.

**Build:**
- **Harden Universal Lead Discovery** (#1): expand scraper coverage to remaining platforms not covered in Phase 1 (Facebook, X, Reddit, Clutch, GoodFirms, JustDial, IndiaMART, Crunchbase, Behance, Dribbble, Job Boards, GitHub, Product Hunt), each as its own `LeadSource` module; add per-source proxy rotation/rate-limit tuning as sites push back; add AI-powered lead enrichment and smart filtering/segmentation across all sources
- **Smart Lead Discovery** (#3): proactive AI recommendations of businesses to look at, based on industry, budget estimation, buying signals, growth, hiring, funding, tech usage, website quality, reviews, digital presence — this is the "AI searches for you" layer on top of everything built in Phases 1–4
- **Client Health Monitor** (#10): ongoing monitoring of existing clients — downtime, SSL expiry, SEO/performance changes, review drops, competitor updates, new products, hiring, funding, brand mentions — via scheduled background jobs
- **Insights Dashboard** (#20): total leads discovered, high-opportunity leads, industry distribution, location heatmaps, opportunity trends, client health alerts, saved research, team activity, AI recommendations — the analytics rollup of everything above

**Definition of Done:**
- [ ] All 16 original sources are queryable through Universal Lead Discovery via scraper modules (or explicitly documented as manual/beta where a source actively blocks scraping)
- [ ] Smart Lead Discovery surfaces unprompted recommendations on the dashboard, refreshed on a schedule
- [ ] Client Health Monitor sends an alert when a tracked client's site goes down, SSL nears expiry, or reviews drop
- [ ] Insights Dashboard shows accurate, real numbers pulled from the live database, not mock data

🛑 **This is the end of the V1 build.** V2 ideas (Section 3) begin only after V1 is fully shipped and stable.

---

## Appendix — V2+ Backlog (do not build now)

Local business heatmaps · Competitor intelligence dashboard · White-label agency reports · AI proposal generator · Public API & integrations · Public agency marketplace · Automated monitoring alert infrastructure · Custom AI agents per agency niche.
