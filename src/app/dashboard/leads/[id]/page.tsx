"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { OutreachFormat } from "@/lib/ai/outreach";
import { MeetingBriefData } from "@/lib/ai/meeting";

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: lead, isLoading } = trpc.leads.get.useQuery({ id });
  
  const [activeTab, setActiveTab] = useState<"postmortem" | "outreach" | "meeting">("outreach");
  const [draftFormat, setDraftFormat] = useState<OutreachFormat>("email");
  const [draft, setDraft] = useState("");
  const [brief, setBrief] = useState<MeetingBriefData | null>(null);
  
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

  if (isLoading || !lead) return <div className="p-8 text-[var(--ink)]">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto text-[var(--ink)]">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-display">{lead.name}</h1>
        <p className="text-sm opacity-70">{lead.domain} • {lead.industry}</p>
      </header>
      
      <div className="flex space-x-4 border-b border-white/10 mb-6 pb-2">
        {(["outreach", "meeting", "postmortem"] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize ${activeTab === tab ? "text-[var(--primary)] border-b-2 border-[var(--primary)] font-medium" : "opacity-60 hover:opacity-100"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {activeTab === "outreach" && (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <select 
              value={draftFormat} 
              onChange={e => setDraftFormat(e.target.value as OutreachFormat)}
              className="bg-[var(--surface)] p-2 rounded-md border border-white/10"
            >
              <option value="email">Cold Email</option>
              <option value="linkedin">LinkedIn Message</option>
              <option value="instagram">Instagram DM</option>
            </select>
            <button 
              onClick={() => outreachMutation.mutate({ leadId: id, format: draftFormat })}
              disabled={outreachMutation.isPending}
              className="bg-[var(--primary)] text-black px-4 py-2 rounded-md font-medium hover:bg-teal-400 disabled:opacity-50"
            >
              {outreachMutation.isPending ? "Generating..." : "Generate AI Draft"}
            </button>
          </div>
          
          {draft && (
            <textarea 
              className="w-full h-64 bg-[var(--surface)] p-4 rounded-md border border-white/10 font-mono text-sm leading-relaxed"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
          )}
        </div>
      )}

      {activeTab === "meeting" && (
        <div className="space-y-6">
          <button 
            onClick={() => meetingMutation.mutate({ leadId: id })}
            disabled={meetingMutation.isPending}
            className="bg-[var(--primary)] text-black px-4 py-2 rounded-md font-medium hover:bg-teal-400 disabled:opacity-50"
          >
            {meetingMutation.isPending ? "Preparing Briefing..." : "Generate Meeting Briefing"}
          </button>
          
          {brief && (
            <div className="bg-[var(--surface)] p-6 rounded-xl border border-white/10 space-y-6">
              <section>
                <h3 className="text-xl font-display mb-2 text-[var(--accent)]">Company Overview</h3>
                <p>{brief.companyOverview}</p>
              </section>
              <section>
                <h3 className="text-xl font-display mb-2 text-[var(--accent)]">Founder Info</h3>
                <p>{brief.founderInfo}</p>
              </section>
              <section>
                <h3 className="text-xl font-display mb-2 text-[var(--accent)]">Suggested Agenda</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {brief.suggestedAgenda.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </section>
              <section>
                <h3 className="text-xl font-display mb-2 text-[var(--accent)]">Discovery Questions</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {brief.questionsToAsk.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </section>
              <section>
                <h3 className="text-xl font-display mb-2 text-[var(--accent)]">Timeline Highlights</h3>
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

      {activeTab === "postmortem" && (
        <div className="bg-[var(--surface)] p-6 rounded-xl border border-white/10 overflow-auto">
          <pre className="text-xs font-mono text-white/70">
            {JSON.stringify(lead.postmortem || { message: "No postmortem data. Run AI Research in dashboard." }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
