"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Shield, Trash, Plus, Swap, ClipboardText } from "@phosphor-icons/react";

export default function SettingsPage() {
  const { data: members, refetch: refetchMembers } = trpc.workspace.getMembers.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.workspace.getLogs.useQuery();
  const { data: agencyProfile } = trpc.agency.getProfile.useQuery();

  const [activeUserId, setActiveUserId] = useState(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(new RegExp('(^| )simulated-user-id=([^;]+)'));
      if (match) return match[2];
      return localStorage.getItem("simulated-user-id") || "test_user_123";
    }
    return "test_user_123";
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "MEMBER">("MEMBER");
  const [inviteClerkId, setInviteClerkId] = useState("");

  const inviteMutation = trpc.workspace.inviteMember.useMutation({
    onSuccess: () => {
      refetchMembers();
      refetchLogs();
      setInviteEmail("");
      setInviteName("");
      setInviteClerkId("");
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const removeMutation = trpc.workspace.removeMember.useMutation({
    onSuccess: () => {
      refetchMembers();
      refetchLogs();
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const updateRoleMutation = trpc.workspace.updateRole.useMutation({
    onSuccess: () => {
      refetchMembers();
      refetchLogs();
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const handleUserSwitch = (userId: string) => {
    document.cookie = `simulated-user-id=${userId}; path=/`;
    localStorage.setItem("simulated-user-id", userId);
    setActiveUserId(userId);
    window.location.reload();
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName || !inviteClerkId) {
      alert("Please fill in all fields.");
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail,
      name: inviteName,
      clerkId: inviteClerkId,
      role: inviteRole,
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-[var(--ink)] space-y-8">
      <header className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-bold font-display">Workspace Settings</h1>
        <p className="text-sm opacity-70">Configure team roles, simulate active user sessions, and view audit trails.</p>
      </header>

      {/* 1. Simulation Controls */}
      <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold font-display flex items-center gap-2 text-[var(--primary)]">
          <Swap size={18} />
          Active User Simulator
        </h2>
        <p className="text-xs opacity-70">
          Since authentication is simulated locally, select an active user persona to view how permissions and roles adapt dynamically.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: "test_user_123", name: "Test Owner", email: "owner@strot.agency", role: "OWNER" },
            { id: "test_user_456", name: "Alice Dev", email: "alice@strot.agency", role: "MEMBER" },
            { id: "test_user_789", name: "Bob Marketer", email: "bob@strot.agency", role: "MEMBER" },
          ].map((persona) => (
            <button
              key={persona.id}
              onClick={() => handleUserSwitch(persona.id)}
              className={`p-4 rounded-lg border text-left transition-all ${
                activeUserId === persona.id
                  ? "bg-[var(--primary-subtle)] border-[var(--primary)] text-white shadow-[0_0_12px_var(--primary-glow)]"
                  : "bg-[var(--surface-raised)] border-white/5 hover:border-white/20 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="font-bold flex items-center justify-between text-sm">
                {persona.name}
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                  persona.role === "OWNER" ? "bg-[var(--accent)] text-black font-semibold" : "bg-white/10 text-white"
                }`}>
                  {persona.role}
                </span>
              </div>
              <div className="text-xs opacity-60 mt-1">{persona.email}</div>
              <div className="text-[10px] font-mono opacity-40 mt-2">ID: {persona.id}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Team Roster & Invitations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold font-display flex items-center gap-2 text-[var(--primary)]">
            <Users size={18} />
            Team Members
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 opacity-70">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members?.map((m: any) => (
                  <tr key={m.id} className="group">
                    <td className="py-3">
                      <div className="font-medium text-white">{m.user.name}</div>
                      <div className="opacity-60 text-[10px]">{m.user.email}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <Shield size={12} className="text-white/60" />
                        <select
                          value={m.role}
                          onChange={(e) => updateRoleMutation.mutate({ memberId: m.id, role: e.target.value as any })}
                          className="bg-transparent text-xs border border-transparent hover:border-white/20 p-1 rounded cursor-pointer"
                        >
                          <option value="OWNER" className="bg-[var(--surface-raised)]">OWNER</option>
                          <option value="MEMBER" className="bg-[var(--surface-raised)]">MEMBER</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => removeMutation.mutate({ memberId: m.id })}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-white/50 hover:text-[var(--error)] rounded transition-all"
                        title="Remove Team Member"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invite Member form */}
        <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold font-display flex items-center gap-2 text-[var(--primary)]">
            <Plus size={18} />
            Simulate Invitation
          </h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Simulated Clerk ID</label>
              <input
                type="text"
                value={inviteClerkId}
                onChange={(e) => setInviteClerkId(e.target.value)}
                placeholder="e.g. user_alice_456"
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Alice Dev"
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. alice@strot.agency"
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Initial Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="OWNER">OWNER</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="w-full bg-[var(--primary)] text-white font-semibold py-2 rounded text-xs hover:bg-[var(--primary-hover)] transition-all disabled:opacity-50"
            >
              {inviteMutation.isPending ? "Adding..." : "Add Simulated Member"}
            </button>
          </form>
        </section>
      </div>

      {/* 3. Activity Logs */}
      <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold font-display flex items-center gap-2 text-[var(--primary)]">
          <ClipboardText size={18} />
          Workspace Activity Logs
        </h2>
        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
          {logs?.length === 0 ? (
            <p className="text-xs opacity-50 py-4">No logged activities in this workspace yet.</p>
          ) : (
            logs?.map((l: any) => (
              <div key={l.id} className="flex justify-between items-start text-xs border-b border-white/5 pb-2 last:border-b-0">
                <div>
                  <span className="font-semibold text-white mr-1.5">{l.user.name}</span>
                  <span className="opacity-60">{l.description}</span>
                  <div className="text-[10px] opacity-40 mt-0.5">{new Date(l.createdAt).toLocaleString()}</div>
                </div>
                <span className="text-[10px] uppercase tracking-wider bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/70">
                  {l.action}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. Shareable Agency Link */}
      {agencyProfile && (
        <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Public Shareable Agency URL</h2>
            <p className="text-xs opacity-60 mt-0.5">Use this public link to showcase services, portfolios, and case studies to leads.</p>
          </div>
          <a
            href={`/agency/${agencyProfile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary text-xs flex items-center gap-2"
          >
            Open Profile Page (/agency/{agencyProfile.slug})
          </a>
        </section>
      )}
    </div>
  );
}
