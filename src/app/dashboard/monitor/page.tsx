"use client";

import { trpc } from "@/lib/trpc";
import { Heartbeat, Activity, WarningCircle, CheckCircle, ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import Link from "next/link";

export default function MonitorDashboardPage() {
  const { data: alerts, isLoading, refetch } = trpc.monitor.getLatestAlerts.useQuery();
  const runChecksMutation = trpc.monitor.runAllChecks.useMutation({
    onSuccess: (data) => {
      alert(`Completed checks for ${data.checked} domains.`);
      refetch();
    },
    onError: (err) => {
      alert(`Error running checks: ${err.message}`);
    }
  });

  if (isLoading) {
    return <div className="p-8 text-[var(--ink)]">Loading monitor data...</div>;
  }

  const activeAlerts = alerts || [];
  const criticalCount = activeAlerts.filter(a => a.status === "critical").length;
  const warningCount = activeAlerts.filter(a => a.status === "warning").length;
  const healthyCount = activeAlerts.filter(a => a.status === "healthy").length;
  const totalCount = activeAlerts.length;

  return (
    <div className="p-8 max-w-6xl mx-auto text-[var(--ink)] space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-3">
            <Heartbeat size={32} className="text-[var(--primary)]" />
            Client Health Monitor
          </h1>
          <p className="text-sm opacity-70 mt-1">Continuous uptime, performance, and SSL monitoring for active clients.</p>
        </div>
        <button
          onClick={() => runChecksMutation.mutate()}
          disabled={runChecksMutation.isPending}
          className="btn btn-primary flex items-center gap-2 text-xs px-4 py-2"
        >
          <Activity size={16} />
          {runChecksMutation.isPending ? "Running Checks..." : "Force Check All Now"}
        </button>
      </header>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] border border-white/10 rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-black font-display">{totalCount}</div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mt-1">Monitored Domains</div>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--success-subtle)] rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_var(--success-subtle)]">
          <div className="text-4xl font-black font-display text-[var(--success)]">{healthyCount}</div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mt-1 flex items-center gap-1">
            <CheckCircle size={14} className="text-[var(--success)]" /> Healthy
          </div>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--warning-subtle)] rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_var(--warning-subtle)]">
          <div className="text-4xl font-black font-display text-[var(--warning)]">{warningCount}</div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mt-1 flex items-center gap-1">
            <WarningCircle size={14} className="text-[var(--warning)]" /> Warnings
          </div>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--error-subtle)] rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_var(--error-subtle)]">
          <div className="text-4xl font-black font-display text-[var(--error)]">{criticalCount}</div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mt-1 flex items-center gap-1">
            <WarningCircle size={14} className="text-[var(--error)]" /> Critical Issues
          </div>
        </div>
      </div>

      {/* Status Board */}
      <section className="bg-[var(--surface)] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/2">
                <th className="py-3 px-4 opacity-70 font-semibold">Client / Domain</th>
                <th className="py-3 px-4 opacity-70 font-semibold">Status</th>
                <th className="py-3 px-4 opacity-70 font-semibold">Uptime & SSL</th>
                <th className="py-3 px-4 opacity-70 font-semibold">Response</th>
                <th className="py-3 px-4 opacity-70 font-semibold">Active Alerts</th>
                <th className="py-3 px-4 opacity-70 font-semibold">Last Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center opacity-50">
                    No domains are currently being monitored. Add domains to your Active leads.
                  </td>
                </tr>
              ) : (
                activeAlerts.map((alert: any) => {
                  const issues = alert.alerts as any[];
                  return (
                    <tr key={alert.id} className="group hover:bg-white/2 transition-colors">
                      <td className="py-3 px-4">
                        {alert.lead ? (
                          <Link href={`/dashboard/leads/${alert.leadId}`} className="font-bold text-white hover:text-[var(--primary)] transition-colors block">
                            {alert.lead.name}
                          </Link>
                        ) : (
                          <span className="font-bold text-white opacity-60">Unknown Lead</span>
                        )}
                        <a href={`https://${alert.domain}`} target="_blank" rel="noopener noreferrer" className="opacity-60 text-[10px] hover:underline mt-0.5 block">
                          {alert.domain}
                        </a>
                      </td>
                      
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                          alert.status === "critical" ? "bg-[var(--error-subtle)] text-[var(--error)]" :
                          alert.status === "warning" ? "bg-[var(--warning-subtle)] text-[var(--warning)]" :
                          alert.status === "healthy" ? "bg-[var(--success-subtle)] text-[var(--success)]" :
                          "bg-white/10 text-white"
                        }`}>
                          {alert.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {alert.uptime ? (
                            <span className="text-[var(--success)] flex items-center gap-1" title="Site is up"><CheckCircle size={14} weight="fill" /> UP</span>
                          ) : (
                            <span className="text-[var(--error)] flex items-center gap-1" title="Site is down"><WarningCircle size={14} weight="fill" /> DOWN</span>
                          )}
                          <span className="opacity-30">|</span>
                          {alert.sslValid ? (
                            <span className="text-[var(--success)] flex items-center gap-1" title="SSL Valid"><ShieldCheck size={14} /> SSL</span>
                          ) : (
                            <span className="text-[var(--error)] flex items-center gap-1" title="SSL Invalid or Missing"><ShieldWarning size={14} /> SSL</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono opacity-80">
                          {alert.responseTimeMs ? `${alert.responseTimeMs}ms` : "-"}
                        </div>
                        {alert.httpStatus && (
                          <div className="text-[10px] opacity-50 mt-0.5">HTTP {alert.httpStatus}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {issues && issues.length > 0 ? (
                          <div className="space-y-1">
                            {issues.map((i: any, idx: number) => (
                              <div key={idx} className={`text-[10px] leading-tight flex items-start gap-1 ${
                                i.severity === 'critical' ? 'text-[var(--error)]' : 
                                i.severity === 'warning' ? 'text-[var(--warning)]' : 'opacity-70'
                              }`}>
                                <span className="mt-0.5">•</span>
                                <span>{i.message}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] opacity-40 italic">No issues detected.</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="opacity-70">{new Date(alert.checkedAt).toLocaleDateString()}</div>
                        <div className="text-[10px] opacity-40">{new Date(alert.checkedAt).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
