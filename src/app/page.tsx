"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  MagnifyingGlass,
  ArrowRight,
  LinkedinLogo,
  InstagramLogo,
  Globe,
  MapPin,
  ArrowUpRight,
  SquaresFour,
  Export,
} from "@phosphor-icons/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const FEATURE_CARDS = [
  {
    icon: MagnifyingGlass,
    title: "Universal Lead Discovery",
    body: "One search. Four sources — LinkedIn, Instagram, Google Maps, company websites. Merged and deduplicated automatically.",
  },
  {
    icon: ArrowUpRight,
    title: "Opportunity Detection",
    body: "Surface businesses with weak digital presence, high review activity, or tech gaps that match what you offer.",
  },
  {
    icon: SquaresFour,
    title: "Lead Dashboard",
    body: "Save, tag, organize, and annotate leads in one place. Status tracking, folders, and inline notes — no extra tool.",
  },
  {
    icon: Export,
    title: "CSV Export",
    body: "Take your data wherever you need it. Export any selection of leads with all enriched fields included.",
  },
];

const SOURCES = [
  { label: "LinkedIn",    cls: "source-linkedin",  icon: LinkedinLogo },
  { label: "Instagram",   cls: "source-instagram", icon: InstagramLogo },
  { label: "Google Maps", cls: "source-google",    icon: MapPin },
  { label: "Web",         cls: "source-web",       icon: Globe },
];

const STATS = [
  { value: "4",    label: "data sources, one search" },
  { value: "100%", label: "compliant — no ToS violations" },
  { value: "< 5s", label: "median search latency" },
];

type StatusType = "new" | "active" | "warm" | "cold" | "closed";

function StatusBadge({ status }: { status: StatusType }) {
  const map: Record<StatusType, { label: string; dot: string; badge: string }> = {
    new:    { label: "New",    dot: "status-dot-new",    badge: "badge-primary" },
    active: { label: "Active", dot: "status-dot-active", badge: "badge-success" },
    warm:   { label: "Warm",   dot: "status-dot-warm",   badge: "badge-warning" },
    cold:   { label: "Cold",   dot: "status-dot-cold",   badge: "badge-default" },
    closed: { label: "Closed", dot: "status-dot-closed", badge: "badge-error"   },
  };
  const { label, dot, badge } = map[status];
  return (
    <span className={`badge ${badge}`} style={{ fontSize: 10, gap: 4 }}>
      <span className={`status-dot ${dot}`} style={{ width: 5, height: 5 }} />
      {label}
    </span>
  );
}

function HeroDashboardPreview() {
  const rows = [
    { name: "Linear",      domain: "linear.app",       status: "active" as StatusType, tags: ["SaaS"], srcs: ["web", "github"] },
    { name: "Resend",      domain: "resend.com",        status: "warm"   as StatusType, tags: ["Dev"],  srcs: ["github", "ph"]  },
    { name: "Brew & Grind",domain: "brewandgrind.co",   status: "new"    as StatusType, tags: ["Local"],srcs: ["google"]        },
    { name: "shadcn",      domain: "ui.shadcn.com",     status: "cold"   as StatusType, tags: ["OSS"],  srcs: ["github"]        },
  ];

  return (
    <div className="card" style={{ overflow: "hidden", boxShadow: "0 32px 80px oklch(0 0 0 / 0.55), 0 0 0 1px var(--border-subtle)" }}>
      {/* Titlebar */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-raised)" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["oklch(0.62 0.150 25)", "oklch(0.72 0.120 72)", "oklch(0.68 0.120 154)"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>Strot · Lead Dashboard</span>
        <div style={{ width: 48 }} />
      </div>

      {/* Search bar mock */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 8, alignItems: "center", background: "var(--surface)" }}>
        <MagnifyingGlass size={12} color="var(--ink-muted)" />
        <span style={{ fontSize: 12, color: "var(--ink-muted)", fontStyle: "italic", flex: 1 }}>Search leads...</span>
        <div style={{ display: "flex", gap: 4 }}>
          {["source-google", "source-github", "source-ph", "source-web"].map((cls, i) => (
            <span key={i} className={`source-pill ${cls}`} style={{ fontSize: 9, padding: "1px 5px" }}>
              {["Maps", "GH", "PH", "Web"][i]}
            </span>
          ))}
        </div>
      </div>

      {/* Rows */}
      {rows.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.25 + i * 0.07, ease: EASE }}
          whileHover={{ backgroundColor: "var(--surface-raised)" }}
          style={{ padding: "9px 14px", borderBottom: i < rows.length - 1 ? "1px solid var(--border-subtle)" : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <div style={{ width: 26, height: 26, borderRadius: "var(--r-md)", background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--primary)", flexShrink: 0 }}>
            {r.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{r.name}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>{r.domain}</div>
          </div>
          {r.tags.map(t => <span key={t} className="badge badge-default" style={{ fontSize: 9 }}>{t}</span>)}
          <div style={{ display: "flex", gap: 2 }}>
            {r.srcs.map(s => (
              <span key={s} style={{ width: 14, height: 14, borderRadius: 2, background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "var(--ink-muted)" }}>
                {s === "google" ? "G" : s === "github" ? "H" : s === "ph" ? "P" : "W"}
              </span>
            ))}
          </div>
          <StatusBadge status={r.status} />
        </motion.div>
      ))}

      {/* Footer bar */}
      <div style={{ padding: "9px 14px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-raised)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>4 leads · 3 sources</span>
        <span style={{ fontSize: 10, color: "var(--primary)" }}>Export CSV →</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: "var(--z-sticky)", borderBottom: "1px solid var(--border-subtle)", background: "oklch(0.08 0.000 180 / 0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", height: 56, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: 2 }}>
            <span className="display" style={{ fontSize: 20, color: "var(--primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>STROT</span>
            <span style={{ fontSize: 9, color: "var(--ink-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginLeft: 6 }}>beta</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: 13 }}>Dashboard</Link>
            <Link href="/sign-in" className="btn btn-ghost" style={{ fontSize: 13 }}>Sign in</Link>
            <Link href="/sign-up" className="btn btn-primary" style={{ fontSize: 13 }}>Get started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 24px 80px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
        {/* Left */}
        <div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} style={{ marginBottom: 20 }}>
            <span className="badge badge-primary" style={{ fontSize: 11 }}>
              <Sparkle size={10} weight="fill" />
              Phase 1 · Universal Lead Discovery
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease: EASE }}
            style={{ fontSize: "clamp(38px, 5vw, 60px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.08, color: "var(--ink)", margin: "0 0 20px" }}
          >
            Find the right clients.{" "}
            <em style={{ fontStyle: "italic", color: "var(--primary)" }}>Before</em>{" "}
            anyone else.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.11, ease: EASE }}
            style={{ fontSize: 15, color: "var(--ink-secondary)", lineHeight: 1.65, margin: "0 0 32px", maxWidth: "44ch", fontStyle: "italic" }}
          >
            Strot searches Google Maps, GitHub, Product Hunt, and company websites
            simultaneously — merging results, removing duplicates, showing you exactly who
            to contact and why.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18, ease: EASE }}
            style={{ display: "flex", gap: 10, alignItems: "center" }}
          >
            <Link href="/sign-up" className="btn btn-primary" style={{ fontSize: 14, padding: "10px 20px", gap: 8 }}>
              Start for free <ArrowRight size={14} weight="bold" />
            </Link>
            <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: 14, padding: "10px 20px" }}>
              View demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.32, ease: EASE }}
            style={{ display: "flex", gap: 28, marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--border-subtle)" }}
          >
            {STATS.map(s => (
              <div key={s.label}>
                <div className="display" style={{ fontSize: 24, color: "var(--primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4, maxWidth: "16ch", lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — UI preview */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
          style={{ position: "sticky", top: 72 }}
        >
          <HeroDashboardPreview />
        </motion.div>
      </section>

      {/* ── Sources strip ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", padding: "20px 0", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>Sources searched simultaneously</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SOURCES.map(s => (
              <span key={s.label} className={`source-pill ${s.cls}`}>
                <s.icon size={10} weight="fill" />{s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)", margin: "0 0 12px" }}>
            Everything in the core loop.{" "}
            <em style={{ fontStyle: "italic", color: "var(--ink-secondary)" }}>Nothing outside it.</em>
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-secondary)", fontStyle: "italic", margin: 0 }}>
            Phase 1 ships the search-to-save workflow. Postmortems, outreach, and Chrome extension come next.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
          {FEATURE_CARDS.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: EASE }}
              style={{
                padding: "28px 24px",
                background: "var(--surface)",
                borderRight: i % 2 === 0 ? "1px solid var(--border-subtle)" : "none",
                borderBottom: i < 2 ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: "var(--r-md)", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <f.icon size={16} color="var(--primary)" weight="duotone" />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: 0, lineHeight: 1.6 }}>{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid var(--border-subtle)", padding: "80px 24px", background: "var(--surface)", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)", margin: "0 0 14px" }}>
          Stop tabbing between tools.
        </h2>
        <p style={{ fontSize: 14, color: "var(--ink-secondary)", fontStyle: "italic", margin: "0 auto 28px", maxWidth: "44ch" }}>
          One workspace. Every lead you need — and everything you need to know about them.
        </p>
        <Link href="/sign-up" className="btn btn-primary" style={{ fontSize: 14, padding: "11px 24px", gap: 8 }}>
          Get started free <ArrowRight size={14} weight="bold" />
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="display" style={{ fontSize: 14, color: "var(--primary)", letterSpacing: "-0.04em" }}>STROT</span>
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>© 2025 Strot · Phase 1 MVP</span>
        </div>
      </footer>
    </div>
  );
}
