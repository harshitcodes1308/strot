"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MagnifyingGlass,
  MapPin,
  LinkedinLogo,
  InstagramLogo,
  Globe,
  BookmarkSimple,
  ArrowUpRight,
  Star,
  X,
  CheckCircle,
  CircleNotch,
  Warning,
} from "@phosphor-icons/react";
import { SearchResult, LeadSource } from "@/lib/types";
import { trpc } from "@/lib/trpc";

const EASE = [0.16, 1, 0.3, 1] as const;

// Phase 1 sources - LinkedIn, Instagram, Google Maps, Company Websites
const SOURCE_OPTS: { value: LeadSource; label: string; cls: string; icon: typeof MapPin; description: string }[] = [
  { value: "linkedin",    label: "LinkedIn",        cls: "source-linkedin",  icon: LinkedinLogo, description: "Company pages, employee count, industry"   },
  { value: "instagram",   label: "Instagram",       cls: "source-instagram", icon: InstagramLogo, description: "Follower count, engagement, bio, handle"  },
  { value: "google_maps", label: "Google Maps",     cls: "source-google",    icon: MapPin,        description: "Rating, reviews, category, address, hours" },
  { value: "website",     label: "Company Website", cls: "source-web",       icon: Globe,         description: "Tech stack, performance, CMS, analytics"   },
];

const INDUSTRIES = [
  "Architecture", "Interior Design", "Fashion & Apparel", "Food & Beverage",
  "Coffee", "Marketing & Advertising", "Design Services", "Photography",
  "Real Estate", "Legal Services", "Healthcare", "Fitness & Wellness",
  "Education", "Software / SaaS", "Venture Capital", "E-commerce",
  "Media & Publishing", "Hospitality", "Construction", "Retail",
];

const KEYWORD_INDUSTRY_MAP: Record<string, string> = {
  "restaurant": "Food & Beverage",
  "cafe": "Food & Beverage",
  "coffee": "Food & Beverage",  
  "bar": "Food & Beverage",
  "architect": "Architecture",
  "architecture": "Architecture",
  "interior": "Interior Design",
  "fashion": "Fashion & Apparel",
  "clothing": "Fashion & Apparel",
  "agency": "Marketing & Advertising",
  "marketing": "Marketing & Advertising",
  "design": "Design Services",
  "photo": "Photography",
  "real estate": "Real Estate",
  "lawyer": "Legal Services",
  "doctor": "Healthcare",
  "gym": "Fitness & Wellness",
  "fitness": "Fitness & Wellness",
  "yoga": "Fitness & Wellness",
  "spa": "Fitness & Wellness",
  "salon": "Fitness & Wellness",
  "school": "Education",
  "college": "Education",
  "university": "Education",
  "saas": "Software / SaaS",
  "software": "Software / SaaS",
  "tech": "Software / SaaS",
  "hotel": "Hospitality",
  "motel": "Hospitality",
  "resort": "Hospitality",
  "construction": "Construction",
  "builder": "Construction",
  "contractor": "Construction",
  "plumber": "Construction",
  "electrician": "Construction",
  "retail": "Retail",
  "shop": "Retail",
  "store": "Retail",
  "boutique": "Retail",
  "ecommerce": "E-commerce",
  "e-commerce": "E-commerce",
  "dentist": "Healthcare",
  "clinic": "Healthcare",
  "medical": "Healthcare",
  "hospital": "Healthcare",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [autoIndustry, setAutoIndustry] = useState(false);
  const [activeSources, setActiveSources] = useState<LeadSource[]>(
    ["linkedin", "instagram", "google_maps", "website"]
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [activeRunIds, setActiveRunIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchMutation = trpc.leads.search.useMutation();
  const saveMutation = trpc.leads.save.useMutation();
  const { data: runStatuses } = trpc.leads.getScraperStatus.useQuery(
    { runIds: activeRunIds },
    { 
      enabled: activeRunIds.length > 0, 
      refetchInterval: (query) => {
        // Stop polling if all are done
        const statuses = query.state.data;
        if (!statuses) return 2000; // default interval
        const allDone = statuses.every(s => s.status === 'completed' || s.status === 'failed');
        return allDone ? false : 2000;
      }
    }
  );
  
  const getResultsMutation = trpc.leads.getScraperResults.useMutation();

  // Industry Auto-fill
  useEffect(() => {
    if (!query.trim()) {
      if (autoIndustry) {
        setIndustry("");
        setAutoIndustry(false);
      }
      return;
    }
    const qLower = query.toLowerCase();
    let matchedIndustry = "";
    for (const [kw, ind] of Object.entries(KEYWORD_INDUSTRY_MAP)) {
      if (qLower.includes(kw)) {
        matchedIndustry = ind;
        break;
      }
    }
    
    if (matchedIndustry && (industry === "" || autoIndustry)) {
      setIndustry(matchedIndustry);
      setAutoIndustry(true);
    } else if (!matchedIndustry && autoIndustry) {
      setIndustry("");
    }
  }, [query]);

  // Handle polling completion
  useEffect(() => {
    if (activeRunIds.length === 0 || !runStatuses) return;
    const allDone = runStatuses.every(s => s.status === 'completed' || s.status === 'failed');
    if (allDone) {
      // Fetch final results
      getResultsMutation.mutateAsync({ runIds: activeRunIds }).then((finalResults: SearchResult[]) => {
        setResults(finalResults);
        setLoading(false);
        setSearched(true);
        setActiveRunIds([]);
      }).catch((e: Error) => {
        console.error("Failed to fetch final results", e);
        setLoading(false);
        setActiveRunIds([]);
      });
    }
  }, [runStatuses, activeRunIds, getResultsMutation]);

  const toggleSource = useCallback((src: LeadSource) => {
    setActiveSources(prev =>
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  }, []);

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    setResults([]);
    try {
      const runIds = await searchMutation.mutateAsync({
        query,
        location: location || undefined,
        industry: industry || undefined,
        sources: ["deep-discovery"] as any,
      });
      if (runIds.length === 0) {
        setLoading(false);
        setSearched(true);
      } else {
        setActiveRunIds(runIds); // Starts polling
      }
    } catch (e) {
      console.error("Search failed:", e);
      setLoading(false);
      setSearched(true);
    }
  }, [query, location, industry, searchMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") runSearch();
  }, [runSearch]);

  const handleIndustryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setIndustry(e.target.value);
    setAutoIndustry(false); // Manual override clears auto flag
  }, []);

  const toggleSave = useCallback(async (result: SearchResult) => {
    if (savedIds.has(result.id) || result.isSaved) return; // Already saved

    try {
      await saveMutation.mutateAsync({
        id: result.id,
        name: result.name,
        domain: result.domain ?? undefined,
        description: result.description ?? undefined,
        avatar: result.avatar ?? undefined,
        source: result.source,
        sourceUrl: result.sourceUrl,
        profileUrl: result.profileUrl ?? undefined,
        socialProfiles: result.socialProfiles,
        sources: result.sources,
        emails: result.emails,
        phones: result.phones,
        location: result.location ?? undefined,
        industry: result.industry ?? undefined,
        employeeCount: result.employeeCount ?? undefined,
        foundedYear: result.foundedYear ?? undefined,
        followers: result.followers ?? undefined,
        engagement: result.engagement ?? undefined,
        rating: result.rating ?? undefined,
        reviewCount: result.reviewCount ?? undefined,
        techStack: result.techStack,
        hasWebsite: result.hasWebsite,
        isRunningAds: result.isRunningAds,
        dataCompleteness: result.dataCompleteness,
        opportunitySignals: result.opportunitySignals ?? [],
        linkedin: result.linkedin,
        instagram: result.instagram,
        google: result.google,
        website: result.website,
      });

      setSavedIds(prev => {
        const next = new Set(prev);
        next.add(result.id);
        return next;
      });
    } catch (e) {
      console.error("Failed to save lead:", e);
      alert("Failed to save lead. Check console for details.");
    }
  }, [savedIds, saveMutation]);

  const savedCount = savedIds.size;
  const enabledCount = activeSources.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div style={{ height: 52, borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0, background: "var(--surface)" }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Discover</h1>
        <span style={{ fontSize: 12, color: "var(--ink-muted)", fontStyle: "italic" }}>
          Universal Lead Discovery - {enabledCount} source{enabledCount !== 1 ? "s" : ""} active
        </span>
        <div style={{ flex: 1 }} />
        {savedCount > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="btn btn-primary"
            style={{ fontSize: 12, gap: 6 }}
          >
            <CheckCircle size={13} weight="fill" />
            {savedCount} lead{savedCount !== 1 ? "s" : ""} saved
          </motion.button>
        )}
      </div>

      {/* ── Search panel ─────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid var(--border-subtle)", padding: "16px 20px", background: "var(--surface)", flexShrink: 0 }}>

        {/* Main query */}
        <div
          style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "0 14px", marginBottom: 12 }}
          onClick={() => inputRef.current?.focus()}
        >
          {loading
            ? <CircleNotch size={16} color="var(--primary)" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
            : <MagnifyingGlass size={16} color="var(--ink-muted)" style={{ flexShrink: 0 }} />
          }
          <input
            ref={inputRef}
            className="command-input"
            placeholder='Search by keyword, niche, industry... e.g. "coffee shop Portland" or "design agency NYC"'
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ fontSize: 14, padding: "13px 0" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setSearched(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-muted)", display: "flex" }}>
              <X size={14} />
            </button>
          )}
          <button className="btn btn-primary" style={{ fontSize: 13, padding: "7px 18px", flexShrink: 0 }} onClick={runSearch} disabled={!query.trim() || loading}>
            Search
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "0 8px" }}>
            <MapPin size={12} color="var(--ink-muted)" />
            <input
              className="command-input"
              placeholder="Any location..."
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ fontSize: 12, padding: "6px 0", width: 120, background: "transparent" }}
            />
          </div>

          <select
            className="input"
            style={{ width: "auto", fontSize: 12, cursor: "pointer", borderColor: autoIndustry ? "var(--primary-subtle)" : undefined }}
            value={industry}
            onChange={handleIndustryChange}
          >
            <option value="">All industries</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}{autoIndustry && industry === i ? " ✨" : ""}</option>)}
          </select>

          {(location || industry || activeSources.length < 4) && (
            <button className="btn btn-ghost" style={{ fontSize: 12, gap: 4, color: "var(--ink-muted)" }} onClick={() => { setLocation(""); setIndustry(""); setActiveSources(["linkedin", "instagram", "google_maps", "website"]); }}>
              <X size={11} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Loading */}
        {loading && (
          <div style={{ padding: "24px 20px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <CircleNotch size={13} color="var(--primary)" style={{ animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                Running scrapers across {enabledCount} source{enabledCount !== 1 ? "s" : ""} - merging results...
              </span>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              {runStatuses && runStatuses.map((rs, i) => {
                const isCompleted = rs.status === "completed";
                const isFailed = rs.status === "failed";
                const resultsCount = rs.resultsCount || 0;

                return (
                  <motion.div key={`${rs.id}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.12 }} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: isCompleted ? "var(--success)" : isFailed ? "var(--error)" : "var(--ink-muted)" }}>
                    <span>Deep Discovery</span>
                    {!isCompleted && !isFailed && <CircleNotch size={9} style={{ animation: "spin 0.8s linear infinite" }} />}
                    {isCompleted && <span style={{ marginLeft: 2 }}>({resultsCount} found)</span>}
                    {isFailed && <span style={{ marginLeft: 2 }}>(failed)</span>}
                  </motion.div>
                );
              })}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 14, alignItems: "center" }}>
                <div className="skel-line" style={{ width: 36, height: 36, borderRadius: "var(--r-md)", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  <div className="skel-line" style={{ width: `${55 + i * 8}%`, height: 12 }} />
                  <div className="skel-line" style={{ width: `${30 + i * 5}%`, height: 10 }} />
                </div>
                <div className="skel-line" style={{ width: 56, height: 20, borderRadius: "var(--r-pill)" }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty - not searched */}
        {!loading && !searched && (
          <div className="empty-state">
            <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MagnifyingGlass size={24} color="var(--primary)" weight="light" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
                Search across all four sources simultaneously
              </div>
              <em style={{ fontSize: 13, color: "var(--ink-muted)", maxWidth: "38ch", textAlign: "center", display: "block" }}>
                LinkedIn · Instagram · Google Maps · Company Websites - merged and deduplicated.
              </em>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
              {["coffee shop Portland", "architecture firm NYC", "fashion brand London", "design agency"].map(ex => (
                <button key={ex} className="tag" onClick={() => { setQuery(ex); setTimeout(runSearch, 50); }} style={{ cursor: "pointer" }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="empty-state">
            <Warning size={28} color="var(--ink-muted)" weight="light" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>No results found</div>
              <em style={{ fontSize: 13, color: "var(--ink-muted)" }}>Try a different keyword, location, or enable more sources</em>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && searched && results.length > 0 && (
          <div>
            {/* Results header */}
            <div style={{ padding: "9px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", position: "sticky", top: 0, zIndex: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-secondary)" }}>
                {results.length} result{results.length !== 1 ? "s" : ""}
              </span>
              <span style={{ color: "var(--border)" }}>·</span>
              <div style={{ display: "flex", gap: 6 }}>
                {SOURCE_OPTS.filter(s => activeSources.includes(s.value)).map(s => {
                  const count = results.filter(r => r.sources.includes(s.value)).length;
                  if (!count) return null;
                  return (
                    <span key={s.value} className={`source-pill ${s.cls}`} style={{ fontSize: 10 }}>
                      <s.icon size={9} weight="fill" />
                      {count} from {s.label}
                    </span>
                  );
                })}
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: "var(--ink-muted)", fontStyle: "italic" }}>
                Merged · deduplicated · ranked by opportunity signal
              </span>
            </div>

            {/* Result rows */}
            <div className="stagger-children">
              {results.map((result, i) => (
                <SearchResultRow
                  key={`${result.id}-${i}`}
                  result={result}
                  isSaved={savedIds.has(result.id) || result.isSaved}
                  onSave={() => toggleSave(result)}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Result Row ───────────────────────────────────────────────────────────────

function SearchResultRow({
  result,
  isSaved,
  onSave,
  index,
}: {
  result: SearchResult;
  isSaved: boolean;
  onSave: () => void;
  index: number;
}) {
  return (
    <div
      style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer", transition: "background 100ms", animationDelay: `${index * 35}ms` }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
      onMouseLeave={e => (e.currentTarget.style.background = "")}
    >
      {/* Logo / Avatar */}
      <div style={{ width: 36, height: 36, borderRadius: "var(--r-md)", background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--primary)", flexShrink: 0, overflow: "hidden" }}>
        {(() => {
          // Build avatar URL: prefer result.avatar, then Google Favicons for domain, then UI Avatars
          const avatarSrc = result.avatar 
            || (result.domain ? `https://www.google.com/s2/favicons?domain=${result.domain}&sz=128` : null);
          return avatarSrc ? (
            <img 
              src={avatarSrc} 
              alt={result.name} 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Try Google Favicons if not already trying it
                if (result.domain && !target.src.includes('google.com/s2/favicons')) {
                  target.src = `https://www.google.com/s2/favicons?domain=${result.domain}&sz=128`;
                } else if (!target.src.includes('ui-avatars')) {
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(result.name)}&background=random&color=fff&size=128`;
                } else {
                  target.style.display = 'none';
                  target.parentElement!.innerText = result.name[0];
                }
              }} 
            />
          ) : (
            <span>{result.name?.[0] || '?'}</span>
          );
        })()}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          {result.profileUrl ? (
            <a href={result.profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em", textDecoration: "none" }} onClick={e => e.stopPropagation()}>
              {result.name}
            </a>
          ) : (
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{result.name}</span>
          )}
          {result.domain && (
            <a href={`https://${result.domain}`} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, color: "var(--ink-muted)", textDecoration: "none" }} onClick={e => e.stopPropagation()}>
              {result.domain}
            </a>
          )}
          {isSaved && <span className="badge badge-primary" style={{ fontSize: 10 }}>Saved</span>}
        </div>

        <p style={{ fontSize: 12, color: "var(--ink-secondary)", margin: "0 0 8px", lineHeight: 1.55, maxWidth: "64ch" }}>
          {result.description}
        </p>

        {/* Distinct Contact Information (Utmost Priority Phase 2) */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
          {result.emails && result.emails.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--success-subtle)", color: "var(--success)", padding: "6px 12px", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 600, border: "1px solid var(--success-subtle)", maxWidth: "100%", overflow: "hidden" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>✉️</span>
              <a href={`mailto:${result.emails[0]}`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit", textDecoration: "none" }} onClick={e => e.stopPropagation()}>{result.emails[0]}</a>
              {result.emails.length > 1 && <span style={{ opacity: 0.8, fontSize: 11, marginLeft: 4, flexShrink: 0 }} title={result.emails.slice(1).join(", ")}>+{result.emails.length - 1}</span>}
            </div>
          )}
          
          {result.phones && result.phones.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--primary-subtle)", color: "var(--primary)", padding: "6px 12px", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 600, border: "1px solid var(--primary-subtle)", maxWidth: "100%", overflow: "hidden" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>📞</span>
              <a href={`tel:${result.phones[0]}`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit", textDecoration: "none" }} onClick={e => e.stopPropagation()}>{result.phones[0]}</a>
              {result.phones.length > 1 && <span style={{ opacity: 0.8, fontSize: 11, marginLeft: 4, flexShrink: 0 }} title={result.phones.slice(1).join(", ")}>+{result.phones.length - 1}</span>}
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Sources */}
          <div style={{ display: "flex", gap: 4 }}>
            {result.sources.map(s => {
              const opt = SOURCE_OPTS.find(o => o.value === s);
              if (!opt) return null;
              // Resolve source link: try socialProfiles with various key formats, then sourceUrl
              const profiles = (result.socialProfiles || {}) as Record<string, string | undefined>;
              let url: string | null = null;
              if (s === "website" && result.domain) {
                url = `https://${result.domain}`;
              } else if (s === "google_maps") {
                // socialProfiles may use key "google_maps" or "google"
                url = profiles["google_maps"] || profiles["google"] || (s === result.source ? result.sourceUrl : null);
              } else {
                url = profiles[s] || (s === result.source ? result.sourceUrl : null);
              }
              // Filter out empty strings
              if (url === "") url = null;

              return url ? (
                <a key={s} href={url} target="_blank" rel="noopener noreferrer" className={`source-pill ${opt.cls}`} style={{ fontSize: 10, textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                  <opt.icon size={9} weight="fill" />
                  {opt.label}
                </a>
              ) : (
                <span key={s} className={`source-pill ${opt.cls}`} style={{ fontSize: 10 }}>
                  <opt.icon size={9} weight="fill" />
                  {opt.label}
                </span>
              );
            })}
          </div>

          {result.location && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-muted)" }}>
              <MapPin size={10} /> {result.location}
            </span>
          )}

          {result.industry && (
            <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{result.industry}</span>
          )}

          {result.linkedin?.followers && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-muted)" }}>
              <LinkedinLogo size={10} />
              <span className="mono">{result.linkedin.followers.toLocaleString()}</span> followers
            </span>
          )}

          {result.instagram?.followers && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-muted)" }}>
              <InstagramLogo size={10} />
              <span className="mono">{result.instagram.followers.toLocaleString()}</span> followers
              {result.instagram.engagementRate && (
                <span style={{ color: "var(--accent)" }}>· {result.instagram.engagementRate}% eng.</span>
              )}
            </span>
          )}

          {result.google?.rating && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-muted)" }}>
              <Star size={10} weight="fill" color="var(--warning)" />
              {result.google.rating} ({result.google.reviewCount} reviews)
            </span>
          )}

          {result.website?.performanceScore !== undefined && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: result.website.performanceScore < 50 ? "var(--error)" : "var(--ink-muted)" }}>
              Perf: {result.website.performanceScore}/100
            </span>
          )}
        </div>

        {/* Opportunity signals & Pain Points */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          {result.opportunitySignals && result.opportunitySignals.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {result.opportunitySignals.slice(0, 3).map((sig, idx) => (
                <span key={`${sig}-${idx}`} className="badge badge-warning" style={{ fontSize: 10 }}>
                  {sig}
                </span>
              ))}
            </div>
          )}
          
          {result.painPoints && result.painPoints.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {result.painPoints.map((point, idx) => (
                <span key={`pain-${idx}`} className="badge badge-error" style={{ fontSize: 10 }}>
                  ⚠️ {point}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Photos Gallery */}
        {result.photos && result.photos.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
            {result.photos.slice(0, 5).map((photoUrl, idx) => (
              <div key={`photo-${idx}`} style={{ width: 48, height: 48, borderRadius: "var(--r-md)", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)" }}>
                <img src={photoUrl} alt="Location" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0, marginTop: 2 }}>
        {result.domain && (
          <a href={`https://${result.domain}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ padding: "5px 8px" }} title="Visit site" onClick={e => e.stopPropagation()}>
            <ArrowUpRight size={13} />
          </a>
        )}
        <button
          className={`btn ${isSaved ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: 12, gap: 5, padding: "5px 12px" }}
          onClick={onSave}
        >
          {isSaved
            ? <><CheckCircle size={13} weight="fill" /> Saved</>
            : <><BookmarkSimple size={13} /> Save</>
          }
        </button>
      </div>
    </div>
  );
}
