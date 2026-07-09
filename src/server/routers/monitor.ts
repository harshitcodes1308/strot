/**
 * Client Health Monitor Router - Phase 5
 * Checks website uptime, SSL status, and response time for saved leads.
 * Results are persisted in MonitorAlert records for trending/history.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { checkDomainHealth } from "@/lib/monitor";

export const monitorRouter = createTRPCRouter({
  /**
   * Run a health check for a single lead by ID.
   */
  checkHealth: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.lead.findUnique({
        where: { id: input.leadId, workspaceId: ctx.workspaceId },
      });

      if (!lead) throw new Error("Lead not found");
      if (!lead.domain) throw new Error("Lead has no domain to check");

      const result = await checkDomainHealth(lead.id, lead.domain);

      // Persist the alert
      const alert = await ctx.db.monitorAlert.create({
        data: {
          workspaceId: ctx.workspaceId,
          leadId: lead.id,
          domain: result.domain,
          status: result.status,
          uptime: result.uptime,
          httpStatus: result.httpStatus,
          responseTimeMs: result.responseTimeMs,
          sslValid: result.sslExpiry?.valid ?? null,
          alerts: result.alerts as object,
          checkedAt: result.checkedAt,
        },
      });

      return { ...result, alertId: alert.id };
    }),

  /**
   * Run health checks for ALL leads with domains in the workspace.
   * Returns a summary - suited for a cron/background job trigger.
   */
  runAllChecks: protectedProcedure.mutation(async ({ ctx }) => {
    const leads = await ctx.db.lead.findMany({
      where: { workspaceId: ctx.workspaceId, domain: { not: null } },
      select: { id: true, name: true, domain: true },
    });

    if (leads.length === 0) return { checked: 0, alerts: [] };

    const results = await Promise.allSettled(
      leads.map(async (lead) => {
        if (!lead.domain) return null;
        const result = await checkDomainHealth(lead.id, lead.domain);

        await ctx.db.monitorAlert.create({
          data: {
            workspaceId: ctx.workspaceId,
            leadId: lead.id,
            domain: result.domain,
            status: result.status,
            uptime: result.uptime,
            httpStatus: result.httpStatus,
            responseTimeMs: result.responseTimeMs,
            sslValid: result.sslExpiry?.valid ?? null,
            alerts: result.alerts as object,
            checkedAt: result.checkedAt,
          },
        });

        return { leadName: lead.name, ...result };
      })
    );

    const succeeded = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<unknown>).value);

    return { checked: succeeded.length, alerts: succeeded };
  }),

  /**
   * Get the most recent health check result per lead.
   */
  getLatestAlerts: protectedProcedure.query(async ({ ctx }) => {
    // Fetch last 50 alerts, de-duped by domain (latest per domain)
    const alerts = await ctx.db.monitorAlert.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { checkedAt: "desc" },
      take: 50,
      include: { lead: { select: { id: true, name: true } } },
    });

    // De-dupe: keep only the most recent per leadId
    const seen = new Set<string>();
    const deduped = alerts.filter((a) => {
      const key = a.leadId ?? a.domain;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped;
  }),

  /**
   * Get full history for a specific lead.
   */
  getLeadHistory: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.monitorAlert.findMany({
        where: { workspaceId: ctx.workspaceId, leadId: input.leadId },
        orderBy: { checkedAt: "desc" },
        take: 20,
      });
    }),
});
