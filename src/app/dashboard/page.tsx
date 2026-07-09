"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  MagnifyingGlass,
  Export,
  Pencil,
  Trash,
  ArrowUpRight,
  SlidersHorizontal,
  X,
  CheckSquare,
  Square,
  Sparkle,
  User
} from "@phosphor-icons/react";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/export";
import { LeadStatus, LeadSource } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;

type SortKey = "savedAt" | "name" | "status" | "matchScore";

const STATUS_OPTS: { value: string; label: string; badge: string; dot: string }[] = [
  { value: "new",    label: "New",    badge: "badge-primary", dot: "status-dot-new"    },
  { value: "active", label: "Active", badge: "badge-success", dot: "status-dot-active" },
  { value: "warm",   label: "Warm",   badge: "badge-warning", dot: "status-dot-warm"   },
  { value: "cold",   label: "Cold",   badge: "badge-default", dot: "status-dot-cold"   },
  { value: "closed", label: "Closed", badge: "badge-error",   dot: "status-dot-closed" },
];

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTS.find(o => o.value === status) || STATUS_OPTS[0];
  return (
    <span className={`badge ${opt.badge}`} style={{ fontSize: 11, gap: 5 }}>
      <span className={`status-dot ${opt.dot}`} />
      {opt.label}
    </span>
  );
}

function SourcePills({ sources }: { sources: string[] }) {
  const SOURCE_LABELS: Record<string, string> = {
    google_maps: "Maps",
    linkedin:    "LinkedIn",
    instagram:   "Instagram",
    website:     "Web",
  };

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {sources.map(s => {
        const cls = `source-${s}`;
        return (
          <span key={s} className={`source-pill ${cls}`} style={{ fontSize: 10, gap: 4 }}>
            {SOURCE_LABELS[s] || s}
          </span>
        );
      })}
    </div>
  );
}

export default function AllLeadsPage() {
  const { data: dbLeads, isLoading, refetch } = trpc.leads.listSaved.useQuery();

  const updateStatusMutation = trpc.leads.updateStatus.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.leads.delete.useMutation({ onSuccess: () => refetch() });
  const saveNoteMutation = trpc.leads.updateNotes.useMutation({ onSuccess: () => refetch() });

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("savedAt");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Map db leads with match scores and flattened source data for CSV
  const leads = useMemo(() => {
    if (!dbLeads) return [];
    return dbLeads.map((l: any) => {
      
      // Flatten sourceData (which might be an array of objects in Prisma)
      let google, linkedin, instagram, website;
      if (Array.isArray(l.sourceData)) {
        google = l.sourceData.find((d: any) => d.google)?.google;
        linkedin = l.sourceData.find((d: any) => d.linkedin)?.linkedin;
        instagram = l.sourceData.find((d: any) => d.instagram)?.instagram;
        website = l.sourceData.find((d: any) => d.website)?.website;
      } else if (l.sourceData) {
        google = l.sourceData.google;
        linkedin = l.sourceData.linkedin;
        instagram = l.sourceData.instagram;
        website = l.sourceData.website;
      }

      return {
        ...l,
        savedAt: new Date(l.createdAt),
        matchScore: l.matchScore ?? 0,
        summary: l.description || "",
        tags: [], // Mock fallback
        google,
        linkedin,
        instagram,
        website,
      };
    });
  }, [dbLeads]);

  const filtered = useMemo(() => {
    let res = leads;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter((l: any) =>
        l.name.toLowerCase().includes(q) ||
        (l.domain && l.domain.toLowerCase().includes(q)) ||
        (l.industry && l.industry.toLowerCase().includes(q))
      );
    }
    if (selectedStatus) res = res.filter((l: any) => l.status === selectedStatus);
    if (selectedSource) res = res.filter((l: any) => l.sources.includes(selectedSource));

    return [...res].sort((a: any, b: any) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "matchScore") return b.matchScore - a.matchScore;
      return b.savedAt.getTime() - a.savedAt.getTime();
    });
  }, [leads, search, selectedStatus, selectedSource, sortBy]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  }, [selectedIds, filtered]);

  const handleExport = useCallback(() => {
    const toExport = selectedIds.size > 0
      ? leads.filter((l: any) => selectedIds.has(l.id))
      : filtered;
    downloadCSV(toExport as any);
  }, [leads, filtered, selectedIds]);

  const updateStatus = useCallback((id: string, status: "new" | "active" | "warm" | "cold" | "closed") => {
    updateStatusMutation.mutate({ id, status });
  }, [updateStatusMutation]);

  const deleteLead = useCallback((id: string) => {
    deleteMutation.mutate({ id });
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, [deleteMutation]);

  const saveNote = useCallback((id: string) => {
    saveNoteMutation.mutate({ id, notes: noteText });
    setEditingNote(null);
    setNoteText("");
  }, [saveNoteMutation, noteText]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const hasSelection = selectedIds.size > 0;

  if (isLoading) {
    return <div className="p-8 text-[var(--ink)]">Loading leads dashboard...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
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
        }}
      >
        <h1 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em" }}>
          All Leads
        </h1>
        <span
          style={{ fontSize: 11, color: "var(--ink-muted)", background: "var(--surface-raised)", padding: "2px 7px", borderRadius: "var(--r-pill)", border: "1px solid var(--border-subtle)" }}
        >
          {filtered.length}
        </span>

        <div style={{ flex: 1 }} />

        {/* Actions */}
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: EASE }}
            style={{ display: "flex", gap: 6, alignItems: "center" }}
          >
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{selectedIds.size} selected</span>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, gap: 5 }}
              onClick={handleExport}
            >
              <Export size={13} /> Export
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, gap: 5 }}
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} selected leads?`)) {
                  selectedIds.forEach(id => deleteLead(id));
                }
              }}
            >
              <Trash size={13} /> Delete
            </button>
          </motion.div>
        )}

        {/* Search */}
        <div style={{ position: "relative", width: 220 }}>
          <MagnifyingGlass
            size={14}
            color="var(--ink-muted)"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: 32,
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              padding: "0 10px 0 30px",
              fontSize: 12,
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>

        {/* Filter Toggle */}
        <button
          className={`btn btn-secondary${showFilters ? " active" : ""}`}
          onClick={() => setShowFilters(f => !f)}
          style={{ height: 32, padding: "0 10px" }}
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* ── Filters panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{
              background: "var(--surface)",
              borderBottom: "1px solid var(--border-subtle)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 20px", display: "flex", gap: 20, alignItems: "flex-end" }}>
              {/* Status filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase" }}>Status</span>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    color: "var(--ink)",
                    fontSize: 12,
                    height: 28,
                    padding: "0 8px",
                    outline: "none",
                  }}
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Source filter */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase" }}>Source</span>
                <select
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value)}
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    color: "var(--ink)",
                    fontSize: 12,
                    height: 28,
                    padding: "0 8px",
                    outline: "none",
                  }}
                >
                  <option value="">All Sources</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                  <option value="google_maps">Google Maps</option>
                  <option value="website">Website</option>
                </select>
              </div>

              {/* Sorting */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase" }}>Sort by</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortKey)}
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    color: "var(--ink)",
                    fontSize: 12,
                    height: 28,
                    padding: "0 8px",
                    outline: "none",
                  }}
                >
                  <option value="savedAt">Date Saved</option>
                  <option value="name">Company Name</option>
                  <option value="status">Status</option>
                  <option value="matchScore">Smart Match Score</option>
                </select>
              </div>

              <div style={{ flex: 1 }} />

              {/* Reset */}
              {(selectedStatus || selectedSource) && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, height: 28, gap: 5, padding: "0 8px" }}
                  onClick={() => {
                    setSelectedStatus("");
                    setSelectedSource("");
                  }}
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <MagnifyingGlass size={32} color="var(--ink-muted)" weight="light" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>No leads found</div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", fontStyle: "italic" }}>Try adjusting your search or filters</div>
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36, paddingLeft: 20 }}>
                  <button
                    onClick={toggleAll}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-muted)", display: "flex" }}
                  >
                    {allSelected ? <CheckSquare size={14} color="var(--primary)" weight="fill" /> : <Square size={14} />}
                  </button>
                </th>
                <th>Company</th>
                <th>Match Score</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Sources</th>
                <th>Industry</th>
                <th>Saved</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => {
                const isSelected = selectedIds.has(lead.id);
                return (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03, ease: EASE }}
                    style={{
                      background: isSelected ? "var(--primary-subtle)" : undefined,
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ paddingLeft: 20, width: 36 }}>
                      <button
                        onClick={() => toggleSelect(lead.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-muted)", display: "flex" }}
                      >
                        {isSelected
                          ? <CheckSquare size={14} color="var(--primary)" weight="fill" />
                          : <Square size={14} />
                        }
                      </button>
                    </td>

                    {/* Company */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "var(--r-md)",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--primary)",
                            flexShrink: 0,
                            overflow: "hidden"
                          }}
                        >
                          {lead.avatar ? (
                            <img 
                              src={lead.avatar} 
                              alt={lead.name} 
                              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.includes('ui-avatars')) {
                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=random&color=fff&size=128`;
                                } else {
                                  target.style.display = 'none';
                                  target.parentElement!.innerText = lead.name[0];
                                }
                              }} 
                            />
                          ) : lead.name[0]}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="hover:underline text-[var(--ink)] font-medium font-sans text-[13px] tracking-tight block"
                          >
                            {lead.name}
                          </Link>
                          {lead.domain ? (
                            <a
                              href={`https://${lead.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mono hover:text-[var(--primary)] hover:underline"
                              style={{ fontSize: 11, color: "var(--ink-muted)", textDecoration: "none", display: "inline-block" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lead.domain}
                            </a>
                          ) : (
                            <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                              No domain
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Match Score */}
                    <td>
                      <div className="flex items-center gap-1.5 font-display font-bold text-sm">
                        <Sparkle size={12} className="text-[var(--accent)]" />
                        <span className={lead.matchScore >= 80 ? "text-[var(--success)]" : (lead.matchScore === 0 ? "opacity-50 text-xs font-normal" : "text-white")}>
                          {lead.matchScore > 0 ? `${lead.matchScore}%` : "Not Run"}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <select
                        value={lead.status}
                        onChange={e => updateStatus(lead.id, e.target.value as "new" | "active" | "warm" | "cold" | "closed")}
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          fontFamily: "inherit",
                          color: "inherit",
                          padding: 0,
                        }}
                      >
                        {STATUS_OPTS.map(o => (
                          <option key={o.value} value={o.value} className="bg-[var(--surface-raised)]">{o.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Assignee */}
                    <td>
                      {lead.assignedTo ? (
                        <div className="flex items-center gap-1 opacity-80" title={lead.assignedTo.email}>
                          <User size={12} className="text-[var(--accent)]" />
                          <span>{lead.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="opacity-40 font-mono">-</span>
                      )}
                    </td>

                    {/* Sources */}
                    <td><SourcePills sources={lead.sources} /></td>

                    {/* Industry */}
                    <td style={{ color: "var(--ink-secondary)", fontSize: 12 }}>
                      {lead.industry ?? "-"}
                    </td>

                    {/* Saved */}
                    <td style={{ color: "var(--ink-muted)", fontSize: 11 }}>
                      {lead.savedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {lead.domain && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 6px", fontSize: 11 }}
                            title="Visit site"
                            onClick={() => window.open(`https://${lead.domain}`, "_blank")}
                          >
                            <ArrowUpRight size={13} />
                          </button>
                        )}
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 6px", fontSize: 11 }}
                          title="Add note"
                          onClick={() => { setEditingNote(lead.id); setNoteText(lead.notes ?? ""); }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 6px", fontSize: 11, color: "var(--error)" }}
                          title="Delete lead"
                          onClick={() => deleteLead(lead.id)}
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Bottom status bar ────────────────────────────────────────── */}
      <div
        style={{
          height: 36,
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 16,
          flexShrink: 0,
          background: "var(--surface)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}{selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }} suppressHydrationWarning>
          Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* ── Note modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingNote && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setEditingNote(null)}
              style={{
                position: "fixed",
                inset: 0,
                background: "oklch(0 0 0 / 0.6)",
                zIndex: "var(--z-modal-bg)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: EASE }}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: "var(--z-modal)",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)",
                padding: 20,
                width: 400,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 24px 60px oklch(0 0 0 / 0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Add Note</h3>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "3px 6px" }}
                  onClick={() => setEditingNote(null)}
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Type note details here..."
                style={{
                  width: "100%",
                  height: 120,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: 10,
                  fontSize: 12,
                  color: "var(--ink)",
                  outline: "none",
                  resize: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditingNote(null)}
                  style={{ fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => saveNote(editingNote)}
                  style={{ fontSize: 12 }}
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
