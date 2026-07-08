"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { OutreachFormat } from "@/lib/ai/outreach";
import { MeetingBriefData } from "@/lib/ai/meeting";
import {
  UserPlus,
  Chats,
  FileText,
  Sparkle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Coins,
  FolderSimple
} from "@phosphor-icons/react";
import Link from "next/link";

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: lead, isLoading: leadLoading, refetch: refetchLead } = trpc.leads.get.useQuery({ id });
  const { data: members } = trpc.workspace.getMembers.useQuery();
  const { data: folders } = trpc.folders.list.useQuery();
  const { data: comments, refetch: refetchComments } = trpc.leads.getComments.useQuery({ leadId: id });
  const { data: recommendations, isLoading: recsLoading } = trpc.leads.getServiceRecommendations.useQuery({ id });
  const { data: match, refetch: refetchMatch } = trpc.agency.getMatchmaking.useQuery({ leadId: id });
  const { data: proposal, refetch: refetchProposal } = trpc.agency.getProposal.useQuery({ leadId: id });

  const leadMatch = match;

  const [activeTab, setActiveTab] = useState<"postmortem" | "outreach" | "meeting" | "match" | "comments" | "proposal">("outreach");
  const [draftFormat, setDraftFormat] = useState<OutreachFormat>("email");
  const [draft, setDraft] = useState("");
  const [brief, setBrief] = useState<MeetingBriefData | null>(null);
  const [commentText, setCommentText] = useState("");

  // Proposal Edit States
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDesc, setProposalDesc] = useState("");
  const [proposalBudget, setProposalBudget] = useState(0);
  const [proposalRequirements, setProposalRequirements] = useState("");
  const [proposalStatus, setProposalStatus] = useState("draft");

  // Sync proposal state when fetched
  const [proposalSynced, setProposalSynced] = useState(false);
  if (proposal && !proposalSynced) {
    setProposalTitle(proposal.title);
    setProposalDesc(proposal.description || "");
    setProposalBudget(proposal.budget || 0);
    setProposalRequirements(proposal.requirements || "");
    setProposalStatus(proposal.status);
    setProposalSynced(true);
  }

  const outreachMutation = trpc.outreach.generateDraft.useMutation({
    onSuccess: (data) => {
      setDraft(data.draft);
    }
  });

  const meetingMutation = trpc.outreach.generateMeetingBrief.useMutation({
    onSuccess: (data) => {
      setBrief(data.brief);
    }
  });

  const assignMutation = trpc.leads.assign.useMutation({
    onSuccess: () => {
      refetchLead();
    }
  });

  const assignFolderMutation = trpc.folders.assignLead.useMutation({
    onSuccess: () => {
      refetchLead();
    }
  });

  const generateResearchMutation = trpc.research.generateInsights.useMutation({
    onSuccess: () => {
      refetchLead();
    }
  });

  const commentMutation = trpc.leads.addComment.useMutation({
    onSuccess: () => {
      refetchComments();
      setCommentText("");
    }
  });

  const saveProposalMutation = trpc.agency.saveProposal.useMutation({
    onSuccess: () => {
      refetchProposal();
      alert("Proposal details saved successfully.");
    }
  });

  const aiProposalMutation = trpc.agency.generateProposalAI.useMutation({
    onSuccess: () => {
      refetchProposal();
      setProposalSynced(false); // force re-sync
    }
  });

  if (leadLoading || !lead) return <div className="p-8 text-[var(--ink)]">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto text-[var(--ink)] space-y-6">
      {/* Back button */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 hover:text-[var(--primary)] transition-all">
        <ArrowLeft size={13} /> Back to dashboard
      </Link>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-display">{lead.name}</h1>
          <p className="text-sm opacity-70 mt-1">{lead.domain || "No domain"} • {lead.industry || "No industry"}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Folder Assignment Selector */}
          <div className="flex items-center gap-2 bg-[var(--surface)] border border-white/10 rounded-lg p-2 text-xs">
            <FolderSimple size={14} className="text-white/60" />
            <span className="opacity-70">Folder:</span>
            <select
              value={lead.folderId || ""}
              onChange={(e) => assignFolderMutation.mutate({ leadId: id, folderId: e.target.value || null })}
              className="bg-transparent text-white border-0 outline-none cursor-pointer text-xs font-semibold max-w-[120px] truncate"
            >
              <option value="" className="bg-[var(--surface-raised)]">No Folder</option>
              {folders?.map((f: any) => (
                <option key={f.id} value={f.id} className="bg-[var(--surface-raised)]">
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Assignment Selector */}
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-white/10 rounded-lg p-2 text-xs">
          <UserPlus size={14} className="text-white/60" />
          <span className="opacity-70">Assignee:</span>
          <select
            value={lead.assignedToId || ""}
            onChange={(e) => assignMutation.mutate({ id, assignedToId: e.target.value || null })}
            className="bg-transparent text-white border-0 outline-none cursor-pointer text-xs font-semibold"
          >
            <option value="" className="bg-[var(--surface-raised)]">Unassigned</option>
            {members?.map((m: any) => (
              <option key={m.userId} value={m.userId} className="bg-[var(--surface-raised)]">
                {m.user.name} ({m.role})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {[
          { id: "outreach", label: "Outreach Builder" },
          { id: "meeting", label: "Meeting Prep" },
          { id: "match", label: "Smart Match & Pitch" },
          { id: "comments", label: `Discussion (${comments?.length || 0})` },
          { id: "proposal", label: "Proposal Workspace" },
          { id: "postmortem", label: "Technical Postmortem" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-all ${
              activeTab === tab.id
                ? "bg-[var(--surface)] text-[var(--primary)] border-b-2 border-[var(--primary)]"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Outreach Tab */}
      {activeTab === "outreach" && (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <select
              value={draftFormat}
              onChange={e => setDraftFormat(e.target.value as OutreachFormat)}
              className="bg-[var(--surface)] p-2 rounded-md border border-white/10 text-xs"
            >
              <option value="email">Cold Email</option>
              <option value="linkedin">LinkedIn Message</option>
              <option value="instagram">Instagram DM</option>
            </select>
            <button
              onClick={() => outreachMutation.mutate({ leadId: id, format: draftFormat })}
              disabled={outreachMutation.isPending}
              className="bg-[var(--primary)] text-white px-4 py-2 rounded-md font-medium text-xs hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {outreachMutation.isPending ? "Generating..." : "Generate AI Draft"}
            </button>
          </div>

          {draft && (
            <textarea
              className="w-full h-64 bg-[var(--surface)] p-4 rounded-md border border-white/10 font-mono text-xs leading-relaxed"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Meeting Tab */}
      {activeTab === "meeting" && (
        <div className="space-y-6">
          <button
            onClick={() => meetingMutation.mutate({ leadId: id })}
            disabled={meetingMutation.isPending}
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-md font-medium text-xs hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {meetingMutation.isPending ? "Preparing Briefing..." : "Generate Meeting Briefing"}
          </button>

          {brief && (
            <div className="bg-[var(--surface)] p-6 rounded-xl border border-white/10 space-y-6 text-xs">
              <section>
                <h3 className="text-sm font-bold font-display mb-2 text-[var(--accent)]">Company Overview</h3>
                <p className="leading-relaxed">{brief.companyOverview}</p>
              </section>
              <section>
                <h3 className="text-sm font-bold font-display mb-2 text-[var(--accent)]">Founder Info</h3>
                <p className="leading-relaxed">{brief.founderInfo}</p>
              </section>
              <section>
                <h3 className="text-sm font-bold font-display mb-2 text-[var(--accent)]">Suggested Agenda</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {brief.suggestedAgenda.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-bold font-display mb-2 text-[var(--accent)]">Discovery Questions</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {brief.questionsToAsk.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-bold font-display mb-2 text-[var(--accent)]">Timeline Highlights</h3>
                <ul className="space-y-2">
                  {brief.timeline.map((item, i) => (
                    <li key={i} className="flex space-x-4 border-l-2 border-[var(--primary)] pl-4">
                      <span className="font-bold opacity-70 w-24">{item.date}</span>
                      <span>{item.event}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      )}

      {/* Smart Match & Pitch Tab */}
      {activeTab === "match" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* AI Pitch Services Recommendations */}
            <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Sparkle size={16} className="text-[var(--accent)]" />
                AI Suggested Services
              </h2>
              {recsLoading ? (
                <div className="text-xs opacity-60">Analyzing pitch fit...</div>
              ) : (
                <div className="space-y-4">
                  {recommendations?.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-[var(--surface-raised)] border border-white/5 rounded-lg p-4 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white text-sm">{rec.serviceName}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          rec.priority === "high" ? "bg-[var(--error-subtle)] text-[var(--error)]" :
                          rec.priority === "medium" ? "bg-[var(--warning-subtle)] text-[var(--warning)]" :
                          "bg-white/10 text-white"
                        }`}>
                          {rec.priority} Priority
                        </span>
                      </div>
                      <p className="opacity-75 leading-relaxed">{rec.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Match Score Side Card */}
          <div className="space-y-6">
            <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 text-center space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-70">Agency Match Score</h3>
              <div className="relative inline-flex items-center justify-center">
                <div className="text-5xl font-black font-display text-[var(--primary)]">
                  {leadMatch?.score ?? "—"}
                </div>
              </div>
              <p className="text-xs opacity-75 max-w-xs mx-auto leading-relaxed">
                {leadMatch?.summary || "Smart match evaluates industry served, website tech stacks, and detected errors."}
              </p>

              {leadMatch && (
                <div className="text-left text-xs border-t border-white/5 pt-4 space-y-3">
                  <div>
                    <div className="font-bold text-[var(--success)] flex items-center gap-1">✔ Match Strengths</div>
                    <ul className="list-disc pl-4 space-y-1 mt-1 opacity-70">
                      {leadMatch.pros.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--error)] flex items-center gap-1">⚠ Potential Challenges</div>
                    <ul className="list-disc pl-4 space-y-1 mt-1 opacity-70">
                      {leadMatch.cons.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Discussion Comments Tab */}
      {activeTab === "comments" && (
        <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-6 text-xs">
          <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
            <Chats size={16} />
            Internal Discussion Thread
          </h2>

          <div className="space-y-4">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add internal comment, notes, or discussion points..."
              className="w-full h-20 bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
            />
            <div className="flex justify-end">
              <button
                onClick={() => commentMutation.mutate({ leadId: id, content: commentText })}
                disabled={commentMutation.isPending || !commentText.trim()}
                className="btn btn-secondary text-xs px-4 py-1.5"
              >
                Post Comment
              </button>
            </div>
          </div>

          <div className="space-y-4 divide-y divide-white/5 pt-4">
            {comments?.length === 0 ? (
              <p className="text-xs opacity-50 py-4 text-center">No comments posted yet. Start the conversation!</p>
            ) : (
              comments?.map((c: any) => (
                <div key={c.id} className="pt-4 first:pt-0">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{c.user.name}</span>
                    <span className="text-[10px] opacity-40">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="opacity-80 mt-1 leading-relaxed">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Proposal Workspace Tab */}
      {activeTab === "proposal" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Main proposal editor */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                  <FileText size={16} />
                  Proposal Scoping
                </h2>
                <button
                  onClick={() => aiProposalMutation.mutate({ leadId: id })}
                  disabled={aiProposalMutation.isPending}
                  className="bg-[var(--primary-subtle)] text-[var(--accent)] border border-[var(--primary-glow)] px-3 py-1 rounded hover:bg-[var(--primary-glow)] transition-all font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkle size={13} />
                  {aiProposalMutation.isPending ? "Generating Scopes..." : "Draft Scope with AI"}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Proposal Title</label>
                  <input
                    type="text"
                    value={proposalTitle}
                    onChange={e => setProposalTitle(e.target.value)}
                    placeholder="e.g. Website Overhaul and Search Ranking Optimization"
                    className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Scope Description</label>
                  <textarea
                    value={proposalDesc}
                    onChange={e => setProposalDesc(e.target.value)}
                    placeholder="Provide a scoping summary of this opportunity..."
                    className="w-full h-24 bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Estimated Budget ($)</label>
                    <input
                      type="number"
                      value={proposalBudget}
                      onChange={e => setProposalBudget(Number(e.target.value))}
                      className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Proposal Status</label>
                    <select
                      value={proposalStatus}
                      onChange={e => setProposalStatus(e.target.value)}
                      className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white mt-1"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Assumptions & Requirements</label>
                  <textarea
                    value={proposalRequirements}
                    onChange={e => setProposalRequirements(e.target.value)}
                    placeholder="Assumptions, dependencies, access tokens required..."
                    className="w-full h-20 bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => saveProposalMutation.mutate({
                    leadId: id,
                    title: proposalTitle,
                    description: proposalDesc,
                    budget: proposalBudget,
                    status: proposalStatus,
                    requirements: proposalRequirements,
                  })}
                  disabled={saveProposalMutation.isPending || !proposalTitle}
                  className="btn btn-primary px-5 py-2"
                >
                  Save Proposal Details
                </button>
              </div>
            </section>
          </div>

          {/* AI generated Milestones & Pricing preview */}
          <div className="space-y-6">
            <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1">
                <Clock size={12} />
                Timeline Milestones
              </h3>
              {proposal?.timeline ? (
                <div className="space-y-3">
                  {(proposal.timeline as any[]).map((t, idx) => (
                    <div key={idx} className="border-l-2 border-[var(--primary)] pl-3 py-0.5 space-y-1">
                      <div className="font-bold text-white">{t.phase}</div>
                      <div className="text-[10px] opacity-60 font-semibold">{t.duration}</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[10px] opacity-75">
                        {t.deliverables.map((d: string, i: number) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] opacity-50">No timeline drafted yet. Use "Draft Scope with AI" to generate one.</p>
              )}
            </section>

            <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1">
                <Coins size={12} />
                Deliverables & Cost
              </h3>
              {proposal?.deliverables ? (
                <div className="space-y-3 divide-y divide-white/5">
                  {(proposal.deliverables as any[]).map((d, idx) => (
                    <div key={idx} className="pt-2.5 first:pt-0 space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{d.title}</span>
                        <span className="text-[var(--accent)]">${d.cost}</span>
                      </div>
                      <p className="text-[10px] opacity-70 leading-relaxed">{d.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] opacity-50">No deliverables pricing breakdown yet. Use "Draft Scope with AI" to generate one.</p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Technical Postmortem Tab */}
      {activeTab === "postmortem" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => generateResearchMutation.mutate({ leadId: id })}
              disabled={generateResearchMutation.isPending}
              className="bg-[var(--primary)] text-white px-4 py-2 rounded-md font-medium text-xs hover:bg-[var(--primary-hover)] disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkle size={14} />
              {generateResearchMutation.isPending ? "Generating Research..." : "Run AI Research & Audit"}
            </button>
          </div>
          
          <div className="bg-[var(--surface)] p-6 rounded-xl border border-white/10 overflow-auto">
            <pre className="text-[10px] font-mono text-white/70 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(lead.postmortem || { message: "No postmortem data. Run AI Research to generate it." }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
