"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MagnifyingGlass,
  Rows,
  FolderSimple,
  Gear,
  Plus,
  ChartBar,
  Question,
  Briefcase,
  Heartbeat,
} from "@phosphor-icons/react";
import { UserButton } from "@clerk/nextjs";

import { trpc } from "@/lib/trpc";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const NAV_ITEMS = [
  { href: "/dashboard",        icon: Rows,            label: "All Leads"    },
  { href: "/dashboard/search", icon: MagnifyingGlass, label: "Discover"     },
  { href: "/dashboard/folders",icon: FolderSimple,    label: "Folders"      },
  { href: "/dashboard/agency-profile", icon: Briefcase, label: "Agency Profile" },
  { href: "/dashboard/analytics", icon: ChartBar,     label: "Analytics"    },
  { href: "/dashboard/monitor",   icon: Heartbeat,    label: "Health Monitor" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: folders } = trpc.folders.list.useQuery();

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "var(--bg)" }}>
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        style={{
          width: collapsed ? 56 : 220,
          flexShrink: 0,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          transition: "width 200ms var(--ease-out)",
          overflow: "hidden",
          position: "sticky",
          top: 0,
          height: "100dvh",
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 52,
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "0" : "0 14px",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
            flexShrink: 0,
            cursor: "pointer",
          }}
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed ? (
            <img
              src="/logo.png"
              alt="Strot Icon"
              style={{ width: 24, height: 24, objectFit: "contain" }}
            />
          ) : (
            <img
              src="/logo.png"
              alt="Strot Logo"
              style={{ height: 24, objectFit: "contain" }}
            />
          )}
        </div>

        {/* New Lead button */}
        {!collapsed && (
          <div style={{ padding: "12px 12px 8px" }}>
            <Link
              href="/dashboard/search"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", fontSize: 12, gap: 6 }}
            >
              <Plus size={12} weight="bold" />
              Discover Leads
            </Link>
          </div>
        )}
        {collapsed && (
          <div style={{ padding: "12px 12px 8px" }}>
            <Link
              href="/dashboard/search"
              className="btn btn-primary"
              style={{ width: 32, height: 32, padding: 0, justifyContent: "center" }}
              title="Discover Leads"
            >
              <Plus size={13} weight="bold" />
            </Link>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${active ? " active" : ""}`}
                  title={collapsed ? item.label : undefined}
                  style={{ justifyContent: collapsed ? "center" : "flex-start" }}
                >
                  <item.icon size={15} weight={active ? "fill" : "regular"} />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>

          {/* Folders section */}
          {!collapsed && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  padding: "0 10px 8px",
                }}
              >
                Folders
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {folders?.map(f => (
                  <Link
                    key={f.id}
                    href={`/dashboard/folders/${f.id}`}
                    className="nav-item"
                    style={{ justifyContent: "space-between" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 2,
                          background: f.color || "var(--primary)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12 }}>{f.name}</span>
                    </div>
                    <span
                      style={{ fontSize: 10, color: "var(--ink-muted)", background: "var(--surface-raised)", padding: "1px 5px", borderRadius: "var(--r-pill)", border: "1px solid var(--border-subtle)" }}
                    >
                      {f._count.leads}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom actions */}
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Link href="/dashboard/settings" className="nav-item" style={{ width: "100%", justifyContent: collapsed ? "center" : "flex-start" }} title={collapsed ? "Settings" : undefined}>
            <Gear size={15} />
            {!collapsed && <span>Settings</span>}
          </Link>
          <button className="nav-item" style={{ width: "100%", border: "none", background: "none", cursor: "pointer", justifyContent: collapsed ? "center" : "flex-start" }} title={collapsed ? "Help" : undefined}>
            <Question size={15} />
            {!collapsed && <span>Help</span>}
          </button>
          <div className="nav-item" style={{ width: "100%", justifyContent: collapsed ? "center" : "flex-start", padding: "8px 10px" }} title={collapsed ? "Account" : undefined}>
            <UserButton showName={!collapsed} appearance={{ elements: { userButtonBox: { width: "100%", justifyContent: collapsed ? "center" : "flex-start" } } }} />
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
