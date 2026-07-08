"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  ChartBar,
  Lightning,
  Globe,
  Sparkle,
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
  XCircle,
  MagnifyingGlass,
  ArrowUp,
  Users,
  Pulse,
  ArrowRight,
  Clock,
} from "@phosphor-icons/react";
import { trpc } from "@/lib/trpc";

const EASE = [0.16, 1, 0.3, 1] as const;

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-lg)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* accent glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent,
          borderRadius: "var(--r-lg) var(--r-lg) 0 0",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--r-md)",
            background: `${accent}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color={accent} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", lineHeight: 1, fontFamily: "var(--font-display)" }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 6 }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

// ─── Health Status Badge ──────────────────────────────────────────────────────
function HealthBadge({ status }: { status: string }) {
  const cfg = {
    healthy:  { icon: CheckCircle,   color: "var(--success)", label: "Healthy"  },
    warning:  { icon: WarningCircle, color: "var(--warning)", label: "Warning"  },
    critical: { icon: XCircle,       color: "var(--error)",   label: "Critical" },
    unknown:  { icon: Clock,         color: "var(--ink-muted)", label: "Unknown" },
  }[status] ?? { icon: Clock, color: "var(--ink-muted)", label: "Unknown" };

  const { icon: Icon, color, label } = cfg;

  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color }}>
      <Icon size={14} weight="fill" />
      {label}
    </span>
  );
}

// ─── Opportunity Level Badge ──────────────────────────────────────────────────
function OpportunityBadge({ level }: { level: "high" | "medium" | "low" }) {
  const colors = {
    high:   { bg: "oklch(0.35 0.13 145 / 0.15)", text: "var(--success)" },
    medium: { bg: "oklch(0.55 0.18 85 / 0.15)",  text: "var(--warning)" },
    low:    { bg: "oklch(0.5 0.0 0 / 0.15)",      text: "var(--ink-muted)" },
  };
  const c = colors[level];
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: "var(--r-pill)",
        background: c.bg,
        color: c.text,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {level}
    </span>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function MiniBarChart({
  data,
  label,
}: {
  data: Array<{ name: string; count: number; color?: string }>;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </span>
      {data.slice(0, 6).map((d, i) => (
        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--ink-secondary)", width: 100, flexShrink: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {d.name}
          </span>
          <div style={{ flex: 1, height: 6, background: "var(--surface-raised)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
              style={{
                height: "100%",
                background: d.color ?? "var(--primary)",
                borderRadius: 3,
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: "var(--ink-muted)", width: 24, textAlign: "right", flexShrink: 0 }}>
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "health" | "discovery">("overview");

  // Queries
  const { data: leads, isLoading: leadsLoading } = trpc.leads.listSaved.useQuery();
  const safeLeads = leads ?? [];
  const { data: activityLogs = [] } = trpc.workspace.getLogs.useQuery();
  const { data: healthAlerts = [], refetch: refetchHealth } = trpc.monitor.getLatestAlerts.useQuery();
  const { data: discoveryData, isLoading: discoveryLoading, refetch: refetchDiscovery } =
    trpc.discovery.getRecommendations.useQuery();

  const runAllChecksMutation = trpc.monitor.runAllChecks.useMutation({
    onSuccess: () => refetchHealth(),
  });

  const refreshDiscovery = trpc.discovery.refreshRecommendations.useMutation({
    onSuccess: () => refetchDiscovery(),
  });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = safeLeads.length;
    const highOpportunity = safeLeads.filter((l: any) => (l.opportunityScore ?? 0) >= 75).length;
    const byStatus = safeLeads.reduce<Record<string, number>>((acc: Record<string, number>, l: any) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    }, {});
    const byIndustry = safeLeads.reduce<Record<string, number>>((acc: Record<string, number>, l: any) => {
      const key = l.industry ?? "Unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const bySources = safeLeads.reduce<Record<string, number>>((acc: Record<string, number>, l: any) => {
      l.sources.forEach((s: string) => { acc[s] = (acc[s] ?? 0) + 1; });
      return acc;
    }, {});
    const avgScore = safeLeads.length
      ? Math.round(safeLeads.reduce((sum: number, l: any) => sum + (l.opportunityScore ?? 0), 0) / safeLeads.length)
      : 0;

    const industryData = Object.entries(byIndustry)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([name, count]) => ({ name, count: count as number }));

    const sourceData = Object.entries(bySources)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([name, count]) => ({ name, count: count as number }));

    const statusColors: Record<string, string> = {
      new:    "var(--primary)",
      active: "var(--success)",
      warm:   "var(--warning)",
      cold:   "var(--ink-muted)",
      closed: "var(--error)",
    };
    const statusData = Object.entries(byStatus).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count: count as number,
      color: statusColors[name],
    }));

    // Health summary
    const healthSummary = healthAlerts.reduce<Record<string, number>>(
      (acc: Record<string, number>, a: any) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; },
      {}
    );

    return { total, highOpportunity, avgScore, byStatus, industryData, sourceData, statusData, healthSummary };
  }, [safeLeads, healthAlerts]);

  const isRunningChecks = runAllChecksMutation.isPending;
  const isRefreshingDiscovery = refreshDiscovery.isPending;

  const TABS = [
    { id: "overview",   label: "Overview",       icon: ChartBar  },
    { id: "health",     label: "Health Monitor", icon: Pulse  },
    { id: "discovery",  label: "Smart Discovery",icon: Sparkle   },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflowY: "auto" }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 52,
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 12,
          flexShrink: 0,
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <h1 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em" }}>
          Insights Dashboard
        </h1>
        <div style={{ flex: 1 }} />

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 2, background: "var(--surface-raised)", borderRadius: "var(--r-md)", padding: 3, border: "1px solid var(--border-subtle)" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: "var(--r-sm)",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                background: activeTab === tab.id ? "var(--surface)" : "transparent",
                color: activeTab === tab.id ? "var(--ink)" : "var(--ink-muted)",
                boxShadow: activeTab === tab.id ? "0 1px 3px oklch(0 0 0 / 0.2)" : "none",
                transition: "all 0.15s",
              }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "24px 24px 40px" }}>
        <AnimatePresence mode="wait">
          {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {leadsLoading ? (
                <div style={{ color: "var(--ink-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
                  Loading analytics…
                </div>
              ) : (
                <>
                  {/* Stat cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                    <StatCard
                      label="Total Leads"
                      value={stats.total}
                      sub="Across all sources"
                      icon={Users}
                      accent="var(--primary)"
                      delay={0}
                    />
                    <StatCard
                      label="High Opportunity"
                      value={stats.highOpportunity}
                      sub="Score ≥ 75 / 100"
                      icon={Lightning}
                      accent="var(--accent)"
                      delay={0.05}
                    />
                    <StatCard
                      label="Avg. Opportunity"
                      value={`${stats.avgScore}%`}
                      sub="Across all scored leads"
                      icon={ArrowUp}
                      accent="var(--success)"
                      delay={0.1}
                    />
                    <StatCard
                      label="Health Alerts"
                      value={healthAlerts.filter((a: any) => a.status !== "healthy").length}
                      sub={`${healthAlerts.length} sites monitored`}
                      icon={Pulse}
                      accent={healthAlerts.filter((a: any) => a.status === "critical").length > 0 ? "var(--error)" : "var(--warning)"}
                      delay={0.15}
                    />
                  </div>

                  {/* Charts row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
                    {/* Industry */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--r-lg)",
                        padding: "20px 24px",
                      }}
                    >
                      <MiniBarChart
                        label="By Industry"
                        data={stats.industryData.map((d, i) => ({
                          ...d,
                          color: `hsl(${220 + i * 25}deg 80% 60%)`,
                        }))}
                      />
                    </motion.div>

                    {/* Sources */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.25, ease: EASE }}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--r-lg)",
                        padding: "20px 24px",
                      }}
                    >
                      <MiniBarChart
                        label="By Source"
                        data={stats.sourceData.map((d, i) => ({
                          ...d,
                          color: `hsl(${170 + i * 30}deg 70% 55%)`,
                        }))}
                      />
                    </motion.div>

                    {/* Status */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--r-lg)",
                        padding: "20px 24px",
                      }}
                    >
                      <MiniBarChart label="By Status" data={stats.statusData} />
                    </motion.div>
                  </div>

                  {/* Opportunity score distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--r-lg)",
                      padding: "20px 24px",
                      marginBottom: 32,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
                      Opportunity Score Distribution
                    </div>
                    {safeLeads.length === 0 ? (
                      <div style={{ color: "var(--ink-muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                        No leads yet — <Link href="/dashboard/search" style={{ color: "var(--primary)" }}>discover some leads</Link> to see analytics.
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80 }}>
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((bucket) => {
                          const count = safeLeads.filter((l: any) => {
                            const score = l.opportunityScore ?? 0;
                            return score >= bucket && score < bucket + 10;
                          }).length;
                          const maxCount = Math.max(
                            ...([0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((b) =>
                              safeLeads.filter((l: any) => {
                                const s = l.opportunityScore ?? 0;
                                return s >= b && s < b + 10;
                              }).length
                            )),
                            1
                          );
                          const heightPct = (count / maxCount) * 100;
                          const isHigh = bucket >= 75;

                          return (
                            <div key={bucket} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPct}%` }}
                                transition={{ duration: 0.5, delay: bucket / 1000, ease: EASE }}
                                title={`${count} lead${count !== 1 ? "s" : ""} scoring ${bucket}–${bucket + 9}`}
                                style={{
                                  width: "100%",
                                  background: isHigh ? "var(--accent)" : "var(--primary)",
                                  borderRadius: "3px 3px 0 0",
                                  opacity: count === 0 ? 0.2 : 1,
                                  minHeight: 4,
                                  cursor: count > 0 ? "pointer" : "default",
                                }}
                              />
                              <span style={{ fontSize: 9, color: "var(--ink-muted)" }}>{bucket}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>

                  {/* Recent activity */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4, ease: EASE }}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--r-lg)",
                      padding: "20px 24px",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
                      Recent Activity
                    </div>
                    {activityLogs.length === 0 ? (
                      <div style={{ color: "var(--ink-muted)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>
                        No activity yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {activityLogs.slice(0, 8).map((log: any) => (
                          <div
                            key={log.id}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 12,
                              padding: "10px 0",
                              borderBottom: "1px solid var(--border-subtle)",
                            }}
                          >
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "var(--primary)",
                                flexShrink: 0,
                                marginTop: 5,
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: "var(--ink)" }}>{log.description}</div>
                              <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                                {new Date(log.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

          {/* ══ HEALTH MONITOR TAB ════════════════════════════════════════════ */}
          {activeTab === "health" && (
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {/* Action bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Client Health Monitor</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                    Live uptime, SSL, and response time checks for all your saved leads.
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-primary"
                  style={{ gap: 7, fontSize: 12 }}
                  onClick={() => runAllChecksMutation.mutate()}
                  disabled={isRunningChecks}
                >
                  <ArrowClockwise size={13} style={{ animation: isRunningChecks ? "spin 1s linear infinite" : "none" }} />
                  {isRunningChecks ? "Checking…" : "Run All Checks"}
                </button>
              </div>

              {/* Summary badges */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {[
                  { key: "healthy",  label: "Healthy",  color: "var(--success)", icon: CheckCircle  },
                  { key: "warning",  label: "Warning",  color: "var(--warning)", icon: WarningCircle },
                  { key: "critical", label: "Critical", color: "var(--error)",   icon: XCircle       },
                  { key: "unknown",  label: "Unknown",  color: "var(--ink-muted)", icon: Pulse       },
                ].map(({ key, label, color, icon: Icon }) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--surface)",
                      border: `1px solid var(--border-subtle)`,
                      borderRadius: "var(--r-md)",
                      padding: "10px 16px",
                    }}
                  >
                    <Icon size={16} color={color} weight="fill" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                      {stats.healthSummary[key] ?? 0}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Alerts table */}
              {healthAlerts.length === 0 ? (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r-lg)",
                    padding: "48px 24px",
                    textAlign: "center",
                  }}
                >
                  <Pulse size={32} color="var(--ink-muted)" weight="light" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>No health checks yet</div>
                  <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>
                    Click "Run All Checks" to start monitoring your leads' websites.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r-lg)",
                    overflow: "hidden",
                  }}
                >
                  <table className="data-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Domain</th>
                        <th>Status</th>
                        <th>HTTP</th>
                        <th>Response Time</th>
                        <th>SSL</th>
                        <th>Last Checked</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthAlerts.map((alert: any) => (
                        <tr key={alert.id}>
                          <td>
                            <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>
                              {alert.lead?.name ?? "Unknown"}
                            </span>
                          </td>
                          <td>
                            <span className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                              {alert.domain}
                            </span>
                          </td>
                          <td>
                            <HealthBadge status={alert.status} />
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12,
                                color:
                                  alert.httpStatus && alert.httpStatus < 300
                                    ? "var(--success)"
                                    : alert.httpStatus
                                    ? "var(--error)"
                                    : "var(--ink-muted)",
                              }}
                            >
                              {alert.httpStatus ?? "—"}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12,
                                color:
                                  alert.responseTimeMs && alert.responseTimeMs > 5000
                                    ? "var(--warning)"
                                    : "var(--ink-secondary)",
                              }}
                            >
                              {alert.responseTimeMs ? `${alert.responseTimeMs}ms` : "—"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: alert.sslValid ? "var(--success)" : "var(--error)" }}>
                              {alert.sslValid === null ? "—" : alert.sslValid ? "Valid" : "Invalid"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                              {new Date(alert.checkedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td>
                            {alert.leadId && (
                              <Link
                                href={`/dashboard/leads/${alert.leadId}`}
                                className="btn btn-ghost"
                                style={{ padding: "3px 7px", fontSize: 11 }}
                              >
                                View
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ SMART DISCOVERY TAB ═══════════════════════════════════════════ */}
          {activeTab === "discovery" && (
            <motion.div
              key="discovery"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Smart Lead Discovery</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                    AI-powered recommendations based on your agency profile and existing lead patterns.
                    {discoveryData?.cached && (
                      <span style={{ marginLeft: 8, color: "var(--ink-muted)", fontSize: 11 }}>
                        (Cached · updates every 24h)
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-secondary"
                  style={{ gap: 7, fontSize: 12 }}
                  onClick={() => refreshDiscovery.mutate()}
                  disabled={isRefreshingDiscovery || discoveryLoading}
                >
                  <ArrowClockwise
                    size={13}
                    style={{ animation: isRefreshingDiscovery ? "spin 1s linear infinite" : "none" }}
                  />
                  {isRefreshingDiscovery ? "Generating…" : "Refresh AI Recs"}
                </button>
              </div>

              {/* AI Summary */}
              {discoveryData?.summary && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  style={{
                    background: "oklch(0.25 0.08 265 / 0.4)",
                    border: "1px solid oklch(0.45 0.15 265 / 0.3)",
                    borderRadius: "var(--r-lg)",
                    padding: "16px 20px",
                    marginBottom: 24,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <Sparkle size={18} color="var(--accent)" weight="fill" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                      AI Strategic Summary
                    </div>
                    <p style={{ fontSize: 13, color: "var(--ink-secondary)", lineHeight: 1.6, margin: 0 }}>
                      {discoveryData.summary}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Loading */}
              {(discoveryLoading || isRefreshingDiscovery) && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-muted)" }}>
                  <Sparkle size={28} weight="duotone" style={{ marginBottom: 12, color: "var(--accent)", animation: "pulse 2s infinite" }} />
                  <div style={{ fontSize: 13 }}>Generating AI recommendations…</div>
                </div>
              )}

              {/* Recommendation cards */}
              {!discoveryLoading && !isRefreshingDiscovery && discoveryData?.recommendations && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                  {(discoveryData.recommendations as any[]).map((rec: {
                    niche: string;
                    searchQuery: string;
                    location?: string;
                    reasoning: string;
                    estimatedOpportunityLevel: "high" | "medium" | "low";
                    buyingSignalsToConfigure: string[];
                  }, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.07, ease: EASE }}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--r-lg)",
                        padding: "20px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* top accent */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 2,
                          background:
                            rec.estimatedOpportunityLevel === "high"
                              ? "var(--success)"
                              : rec.estimatedOpportunityLevel === "medium"
                              ? "var(--warning)"
                              : "var(--ink-muted)",
                        }}
                      />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0, lineHeight: 1.3 }}>
                          {rec.niche}
                        </h3>
                        <OpportunityBadge level={rec.estimatedOpportunityLevel} />
                      </div>

                      <p style={{ fontSize: 12, color: "var(--ink-secondary)", lineHeight: 1.6, margin: 0 }}>
                        {rec.reasoning}
                      </p>

                      {/* Buying signals */}
                      {rec.buyingSignalsToConfigure.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {rec.buyingSignalsToConfigure.map((signal) => (
                            <span
                              key={signal}
                              style={{
                                fontSize: 10,
                                padding: "2px 7px",
                                borderRadius: "var(--r-pill)",
                                background: "var(--surface-raised)",
                                color: "var(--ink-muted)",
                                border: "1px solid var(--border-subtle)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* CTA */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4, borderTop: "1px solid var(--border-subtle)" }}>
                        {rec.location && (
                          <span style={{ fontSize: 11, color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Globe size={11} />
                            {rec.location}
                          </span>
                        )}
                        <div style={{ flex: 1 }} />
                        <Link
                          href={`/dashboard/search?q=${encodeURIComponent(rec.searchQuery)}${rec.location ? `&location=${encodeURIComponent(rec.location)}` : ""}`}
                          className="btn btn-primary"
                          style={{ fontSize: 11, gap: 5, padding: "5px 10px" }}
                        >
                          <MagnifyingGlass size={11} />
                          Search Now
                          <ArrowRight size={11} />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!discoveryLoading && !isRefreshingDiscovery && !discoveryData && (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <Sparkle size={32} color="var(--ink-muted)" weight="light" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
                    No recommendations yet
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>
                    Save some leads first, then AI will suggest new discovery directions.
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
