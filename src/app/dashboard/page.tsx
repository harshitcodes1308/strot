"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MagnifyingGlass,
  Export,
  Tag,
  FolderSimple,
  Pencil,
  Trash,
  ArrowUpRight,
  Star,
  LinkedinLogo,
  InstagramLogo,
  Globe,
  MapPin,
  SlidersHorizontal,
  X,
  CheckSquare,
  Square,
} from "@phosphor-icons/react";
import { MOCK_LEADS, MOCK_FOLDERS, downloadCSV } from "@/lib/mock-data";
import { Lead, LeadStatus, LeadSource } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;

type SortKey = "savedAt" | "name" | "status";

const STATUS_OPTS: { value: LeadStatus; label: string; badge: string; dot: string }[] = [
  { value: "new",    label: "New",    badge: "badge-primary", dot: "status-dot-new"    },
  { value: "active", label: "Active", badge: "badge-success", dot: "status-dot-active" },
  { value: "warm",   label: "Warm",   badge: "badge-warning", dot: "status-dot-warm"   },
  { value: "cold",   label: "Cold",   badge: "badge-default", dot: "status-dot-cold"   },
  { value: "closed", label: "Closed", badge: "badge-error",   dot: "status-dot-closed" },
];

const SOURCE_ICONS: Record<LeadSource, typeof MapPin> = {
  google_maps: MapPin,
  linkedin:    LinkedinLogo,
  instagram:   InstagramLogo,
  website:     Globe,
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  google_maps: "Maps",
  linkedin:    "LinkedIn",
  instagram:   "Instagram",
  website:     "Web",
};

function StatusBadge({ status }: { status: LeadStatus }) {
  const opt = STATUS_OPTS.find(o => o.value === status)!;
  return (
    <span className={`badge ${opt.badge}`} style={{ fontSize: 11, gap: 5 }}>
      <span className={`status-dot ${opt.dot}`} />
      {opt.label}
    </span>
  );
}

function SourcePills({ sources }: { sources: LeadSource[] }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {sources.map(s => {
        const Icon = SOURCE_ICONS[s];
        const cls = `source-${s}`;
        return (
          <span key={s} className={`source-pill ${cls}`} style={{ fontSize: 10, gap: 4 }}>
            <Icon size={9} weight="fill" />
            {SOURCE_LABELS[s]}
          </span>
        );
      })}
    </div>
  );
}

export default function AllLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | "">("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<LeadSource | "">("");
  const [sortBy, setSortBy] = useState<SortKey>("savedAt");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let res = leads;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.domain.toLowerCase().includes(q) ||
        l.industry?.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (selectedStatus) res = res.filter(l => l.status === selectedStatus);
    if (selectedFolder) res = res.filter(l => l.folderId === selectedFolder);
    if (selectedSource) res = res.filter(l => l.sources.includes(selectedSource as LeadSource));

    return [...res].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return b.savedAt.getTime() - a.savedAt.getTime();
    });
  }, [leads, search, selectedStatus, selectedFolder, selectedSource, sortBy]);

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
      ? leads.filter(l => selectedIds.has(l.id))
      : filtered;
    downloadCSV(toExport);
  }, [leads, filtered, selectedIds]);

  const updateStatus = useCallback((id: string, status: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const saveNote = useCallback((id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes: noteText } : l));
    setEditingNote(null);
    setNoteText("");
  }, [noteText]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const hasSelection = selectedIds.size > 0;

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
              onClick={() => setSelectedIds(new Set())}
            >
              <X size={13} /> Clear
            </button>
          </motion.div>
        )}

        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, gap: 5 }}
          onClick={() => setShowFilters(f => !f)}
        >
          <SlidersHorizontal size={13} />
          Filters
          {(selectedStatus || selectedFolder || selectedSource) && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
          )}
        </button>

        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, gap: 5 }}
          onClick={handleExport}
        >
          <Export size={13} />
          Export CSV
        </button>
      </div>

      {/* ── Search + Filters row ─────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "10px 20px",
          display: "flex",
          gap: 8,
          flexShrink: 0,
          background: "var(--bg)",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <MagnifyingGlass
            size={13}
            color="var(--ink-muted)"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            className="input"
            placeholder="Search leads by name, domain, industry, tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, fontSize: 13 }}
          />
        </div>

        {/* Sort */}
        <select
          className="input"
          style={{ width: "auto", paddingRight: 28, fontSize: 12, cursor: "pointer" }}
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
        >
          <option value="savedAt">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="status">By status</option>
        </select>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ overflow: "hidden", flexShrink: 0 }}
          >
            <div
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                padding: "12px 20px",
                display: "flex",
                gap: 20,
                alignItems: "center",
                background: "var(--surface)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>Status</span>
                <select
                  className="input"
                  style={{ width: "auto", fontSize: 12, cursor: "pointer" }}
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as LeadStatus | "")}
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>Folder</span>
                <select
                  className="input"
                  style={{ width: "auto", fontSize: 12, cursor: "pointer" }}
                  value={selectedFolder}
                  onChange={e => setSelectedFolder(e.target.value)}
                >
                  <option value="">All folders</option>
                  {MOCK_FOLDERS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>Source</span>
                <select
                  className="input"
                  style={{ width: "auto", fontSize: 12, cursor: "pointer" }}
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value as LeadSource | "")}
                >
                  <option value="">All sources</option>
                  <option value="google">Google Maps</option>
                  <option value="github">GitHub</option>
                  <option value="producthunt">Product Hunt</option>
                  <option value="web">Web</option>
                </select>
              </div>

              {(selectedStatus || selectedFolder || selectedSource) && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, gap: 4, color: "var(--error)" }}
                  onClick={() => { setSelectedStatus(""); setSelectedFolder(""); setSelectedSource(""); }}
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
                <th>Status</th>
                <th>Sources</th>
                <th>Industry</th>
                <th>Tags</th>
                <th>Folder</th>
                <th>Saved</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => {
                const folder = MOCK_FOLDERS.find(f => f.id === lead.folderId);
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
                          }}
                        >
                          {lead.name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                            {lead.name}
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                            {lead.domain}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <select
                        value={lead.status}
                        onChange={e => updateStatus(lead.id, e.target.value as LeadStatus)}
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
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Sources */}
                    <td><SourcePills sources={lead.sources} /></td>

                    {/* Industry */}
                    <td style={{ color: "var(--ink-secondary)", fontSize: 12 }}>
                      {lead.industry ?? "—"}
                    </td>

                    {/* Tags */}
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {lead.tags.map(t => (
                          <span key={t} className="tag" style={{ fontSize: 10 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Folder */}
                    <td>
                      {folder ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 1, background: folder.color }} />
                          <span style={{ fontSize: 11, color: "var(--ink-secondary)" }}>{folder.name}</span>
                        </div>
                      ) : "—"}
                    </td>

                    {/* Saved */}
                    <td style={{ color: "var(--ink-muted)", fontSize: 11 }}>
                      {lead.savedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 6px", fontSize: 11 }}
                          title="Visit site"
                          onClick={() => window.open(`https://${lead.domain}`, "_blank")}
                        >
                          <ArrowUpRight size={13} />
                        </button>
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
          Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
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
                className="input"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note about this lead..."
                style={{ height: 120, resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setEditingNote(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => saveNote(editingNote)}>Save note</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
