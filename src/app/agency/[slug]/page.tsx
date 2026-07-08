"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Globe, Envelope, Phone, ShieldCheck, ArrowUpRight } from "@phosphor-icons/react";

export default function PublicAgencyProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: agency, isLoading, error } = trpc.agency.getPublicProfile.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--ink)]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary)] mx-auto"></div>
          <p className="text-xs opacity-75 font-mono">Retrieving Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--ink)]">
        <div className="text-center max-w-sm space-y-4">
          <h1 className="text-2xl font-bold font-display text-[var(--error)]">Profile Not Found</h1>
          <p className="text-sm opacity-70">The agency portfolio you are trying to view does not exist or has been moved.</p>
          <a href="/dashboard" className="btn btn-secondary text-xs inline-block">Return to Dashboard</a>
        </div>
      </div>
    );
  }

  const contact = (agency.contactInfo as any) || {};

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] font-sans antialiased selection:bg-[var(--primary-subtle)]">
      {/* 1. Header Hero section */}
      <header className="border-b border-white/10 py-16 px-6 md:px-12 bg-gradient-to-b from-white/2 to-transparent">
        <div className="max-w-5xl mx-auto space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent-subtle)] px-2.5 py-1 rounded">
            Verified Digital Agency
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight text-white mt-3">
            {agency.name}
          </h1>
          {agency.tagline && (
            <p className="text-lg md:text-xl opacity-80 text-[var(--ink-secondary)] font-medium max-w-3xl leading-relaxed">
              {agency.tagline}
            </p>
          )}
          <p className="text-sm opacity-65 max-w-3xl leading-relaxed mt-4">
            {agency.description}
          </p>

          <div className="flex flex-wrap gap-4 pt-4 text-xs">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 opacity-80 hover:opacity-100 text-white">
                <Envelope size={14} className="text-[var(--primary)]" />
                {contact.email}
              </a>
            )}
            {contact.website && (
              <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 opacity-80 hover:opacity-100 text-white">
                <Globe size={14} className="text-[var(--primary)]" />
                {contact.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1.5 opacity-80">
                <Phone size={14} className="text-[var(--primary)]" />
                {contact.phone}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-16">
        {/* 2. Services Grid */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-display text-white border-b border-white/5 pb-2">
            Our Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(agency.services as any[] || []).map((s, idx) => (
              <div
                key={idx}
                className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:border-[var(--primary)] transition-all hover:shadow-[0_0_15px_var(--primary-glow)]"
              >
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded">
                    {s.price || "Contact for pricing"}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">{s.name}</h3>
                  <p className="text-xs opacity-70 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Tech Stack & Industries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tech stack */}
          <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold font-display text-white border-b border-white/5 pb-1">
              Core Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {agency.techStack.map((tech: string) => (
                <span
                  key={tech}
                  className="bg-white/5 border border-white/10 text-white text-xs px-2.5 py-1 rounded font-mono capitalize"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>

          {/* Industries served */}
          <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold font-display text-white border-b border-white/5 pb-1">
              Industries Served
            </h3>
            <div className="flex flex-wrap gap-2">
              {agency.industries.map((ind: string) => (
                <span
                  key={ind}
                  className="bg-[var(--primary-subtle)] border border-[var(--primary-glow)] text-[var(--accent)] text-xs px-2.5 py-1 rounded font-semibold capitalize"
                >
                  {ind}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* 4. Portfolio Projects */}
        {(agency.portfolio as any[] || []).length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-white border-b border-white/5 pb-2">
              Selected Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(agency.portfolio as any[]).map((p, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:border-[var(--primary)] transition-all"
                >
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white">{p.title}</h3>
                    <p className="text-xs opacity-75 leading-relaxed">{p.description}</p>
                  </div>
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline text-xs flex items-center gap-1 mt-4 inline-flex self-start"
                    >
                      Visit Project <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Case Studies */}
        {(agency.caseStudies as any[] || []).length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-white border-b border-white/5 pb-2">
              Client Case Studies
            </h2>
            <div className="space-y-6">
              {(agency.caseStudies as any[]).map((c, idx) => (
                <div key={idx} className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
                  <header>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                      {c.client}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">{c.title}</h3>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
                    <div className="space-y-1.5">
                      <div className="font-semibold text-white/90">Challenge</div>
                      <p className="opacity-70">{c.challenge}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="font-semibold text-white/90">Solution</div>
                      <p className="opacity-70">{c.solution}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="font-semibold text-white/90">Results & Impact</div>
                      <p className="text-[var(--accent)] font-medium bg-[var(--accent-subtle)] p-2.5 rounded border border-[var(--accent-subtle)]">
                        {c.results}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20 py-8 px-6 text-center text-xs opacity-50">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <ShieldCheck size={14} className="text-[var(--success)]" />
          <span>Profile managed securely via Strot Intelligence platform.</span>
        </div>
        <p>© {new Date().getFullYear()} {agency.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
