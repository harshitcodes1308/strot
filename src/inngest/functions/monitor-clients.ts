import { inngest } from "../client";
import { db } from "@/lib/db";
import { checkDomainHealth } from "@/lib/monitor";

/**
 * Hourly Cron Job that monitors the health (uptime, SSL) of all leads with domains
 * in active or closed status.
 */
export const monitorClients = inngest.createFunction(
  {
    id: "monitor-clients",
    name: "Monitor Client Health",
    triggers: [{ cron: "0 * * * *" }], // Runs at minute 0 past every hour
  },
  async ({ step }) => {
    // 1. Fetch all leads that have domains and are worth monitoring
    const leadsToMonitor = await step.run("fetch-leads-to-monitor", async () => {
      return await db.lead.findMany({
        where: {
          domain: { not: null },
          // Only monitor leads that are active or closed (won)
          status: { in: ["active", "closed"] },
        },
        select: { id: true, domain: true, workspaceId: true },
      });
    });

    if (leadsToMonitor.length === 0) {
      return { message: "No active clients to monitor." };
    }

    // 2. Perform health checks in parallel
    const checkResults = await step.run("check-domains-health", async () => {
      const results = await Promise.allSettled(
        leadsToMonitor.map((lead) => {
          if (!lead.domain) return null;
          return checkDomainHealth(lead.id, lead.domain).then(result => ({
            workspaceId: lead.workspaceId,
            ...result,
          }));
        })
      );
      return results;
    });

    // 3. Save alerts
    await step.run("save-monitor-alerts", async () => {
      const validResults = checkResults
        .filter((r) => r.status === "fulfilled" && r.value !== null)
        .map((r) => (r as PromiseFulfilledResult<any>).value);

      if (validResults.length > 0) {
        // Unfortunately createMany doesn't always support complex JSON on some DBs, 
        // but Prisma driver handles it fine in Neon. 
        await db.monitorAlert.createMany({
          data: validResults.map(result => ({
            workspaceId: result.workspaceId,
            leadId: result.leadId,
            domain: result.domain,
            status: result.status,
            uptime: result.uptime,
            httpStatus: result.httpStatus,
            responseTimeMs: result.responseTimeMs,
            sslValid: result.sslExpiry?.valid ?? null,
            alerts: result.alerts,
            checkedAt: result.checkedAt,
          })),
        });
      }
      return validResults.length;
    });

    return { success: true, checkedCount: leadsToMonitor.length };
  }
);
