# DECISIONS.md - Strot Phase 1

A running log of implementation decisions, assumptions, and tradeoffs made during Phase 1 build.

---

## Auth

**Decision:** Clerk for auth, deferred to Phase 1.5 wire-up.

**Reason:** Phase 1 ships the full UI and core loop first with a mock auth flow (redirect to /dashboard on form submit). Clerk wiring (`@clerk/nextjs` middleware, `clerkMiddleware`, `<ClerkProvider>`, `<SignIn>`, `<SignUp>`) is scaffolded as the next commit once the API keys are in place.

**What to do:** Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`, replace sign-in/sign-up pages with `<SignIn />` and `<SignUp />` Clerk components, add `middleware.ts` with `clerkMiddleware()`.

---

## Database

**Decision:** Neon PostgreSQL + Prisma. Not wired in Phase 1 UI build.

**Reason:** Phase 1 ships the UI with mock data (`src/lib/mock-data.ts`) so the product can be demoed immediately. Prisma schema, Neon connection, and tRPC procedures come in Phase 1.5 (the backend sprint).

**Schema starting point:** `User`, `Workspace`, `Lead`, `Company`, `Folder`, `Tag`, `Note`.

---

## API layer

**Decision:** tRPC with `@tanstack/react-query`. Package installed, not scaffolded yet.

**Reason:** Same as DB - UI-first for the Phase 1 demo. tRPC router goes up in Phase 1.5.

---

## Lead Sources - Phase 1 MVP (Revised)

**Decision:** Custom scrapers via Playwright/Puppeteer behind a unified `LeadSource` interface (`fetch → parse → normalize → dedupe`).
MVP Sources: LinkedIn, Instagram, Google Maps, Company Websites.

**Reason:** 
- The product relies heavily on finding businesses and analyzing their digital footprint. 
- API-first approaches (GitHub, Product Hunt) have been deferred to Phase 5 in favor of sources that directly map to agency/freelancer targets (local businesses, e-commerce, social-native brands).
- LinkedIn and Instagram provide the best social/activity signals. Google Maps provides local authority. Websites provide tech stack/conversion intent.
- Implementing a unified interface (`LeadSourceScraper`) early means Phase 5 expansion requires zero core logic changes.

**Implementation detail:** 
- **LinkedIn/Instagram:** Playwright with stealth plugin for profile scraping + JSON endpoints where available.
- **Google Maps:** Google Places API as primary (compliant, fast), with Playwright fallback.
- **Websites:** Headless crawl + PageSpeed Insights API + Wappalyzer-style tech stack fingerprinting.

---

## Duplicate detection

**Decision:** Basic matching on domain similarity + name similarity for Phase 1.

**Reason:** A Levenshtein/Jaro-Winkler comparison on normalized domain+name is sufficient for MVP. AI-powered deduplication (embedding similarity) is a Phase 5 enhancement.

---

## Font strategy

**Decision:** SF Pro system stack for UI text, Kanit (Google Fonts) for display/brand headings.

**Reason:**
- SF Pro: best-in-class on Apple devices (majority of target users), excellent system font everywhere else. Zero load cost.
- Kanit: geometric condensed, Coolvetica-adjacent, premium tool aesthetic. Loaded via `next/font/google` for zero layout shift.
- Subheadings: italic of the same SF Pro stack - humanist italic is the correct premium move per skill guidance (not a separate serif injection).

---

## Design system

**Decision:** Custom CSS variables in OKLCH, no Tailwind component library.

**Reason:** The impeccable skill's guidance is clear - for a product UI of this kind, own the tokens. shadcn/ui is available but not used as default; components are hand-crafted with the design system tokens to avoid the shadcn default look.

**Brand seed:** `oklch(0.55 0.095 180)` - weathered copper patina teal (from palette.mjs seed-160).

---

## Workspace model

**Decision:** Single workspace per user in Phase 1. Multi-team comes in Phase 4.

**Reason:** Explicitly stated in PRD Phase 1 scope.

---

## CSV Export

**Decision:** Client-side CSV generation via Blob + anchor click.

**Reason:** Simple, zero server cost, works immediately. Server-side export (streaming for large datasets) is Phase 5.
