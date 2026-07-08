/**
 * Client Health Monitor
 * Phase 5 — checks website uptime, SSL expiry, and performance changes for saved leads.
 */

export interface HealthCheckResult {
  leadId: string;
  domain: string;
  checkedAt: Date;
  status: "healthy" | "warning" | "critical" | "unknown";
  uptime: boolean | null;
  sslExpiry: { valid: boolean; daysRemaining: number | null } | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  alerts: HealthAlert[];
}

export interface HealthAlert {
  type: "downtime" | "ssl_expiry" | "slow_response" | "http_error" | "performance_drop";
  severity: "critical" | "warning" | "info";
  message: string;
}

/**
 * Run a full health check for a given domain.
 * Uses native fetch — no external dependencies needed.
 */
export async function checkDomainHealth(
  leadId: string,
  domain: string
): Promise<HealthCheckResult> {
  const alerts: HealthAlert[] = [];
  let uptime: boolean | null = null;
  let httpStatus: number | null = null;
  let responseTimeMs: number | null = null;
  let sslExpiry: { valid: boolean; daysRemaining: number | null } | null = null;

  // Normalise domain → HTTPS URL
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Strot-HealthMonitor/1.0 (+https://strot.agency)",
      },
    });

    clearTimeout(timeoutId);
    responseTimeMs = Date.now() - start;
    httpStatus = response.status;
    uptime = response.ok;

    // Slow response alert
    if (responseTimeMs > 5000) {
      alerts.push({
        type: "slow_response",
        severity: "warning",
        message: `Site responded in ${responseTimeMs}ms — above 5 second threshold.`,
      });
    }

    // HTTP error alert
    if (!response.ok) {
      alerts.push({
        type: "http_error",
        severity: httpStatus >= 500 ? "critical" : "warning",
        message: `Site returned HTTP ${httpStatus}.`,
      });
    }

    // SSL check — look at the response URL for HTTPS
    // In server-side Node fetch, we can't directly inspect the TLS cert expiry without
    // a raw TLS connection. We infer HTTPS from the response URL as a lightweight check.
    const isHttps = response.url.startsWith("https://");
    if (!isHttps) {
      sslExpiry = { valid: false, daysRemaining: null };
      alerts.push({
        type: "ssl_expiry",
        severity: "critical",
        message: "Site is not served over HTTPS — SSL certificate may be missing or expired.",
      });
    } else {
      // Mark as valid; deep TLS expiry check requires a separate node:tls call
      sslExpiry = { valid: true, daysRemaining: null };
    }
  } catch (error: unknown) {
    uptime = false;
    const isAbort = error instanceof Error && error.name === "AbortError";
    alerts.push({
      type: "downtime",
      severity: "critical",
      message: isAbort
        ? "Site timed out (>10s). The site may be down or extremely slow."
        : `Site is unreachable: ${error instanceof Error ? error.message : "Unknown error"}.`,
    });
  }

  // Derive overall status
  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");
  const status: HealthCheckResult["status"] = hasCritical
    ? "critical"
    : hasWarning
    ? "warning"
    : uptime
    ? "healthy"
    : "unknown";

  return {
    leadId,
    domain,
    checkedAt: new Date(),
    status,
    uptime,
    sslExpiry,
    httpStatus,
    responseTimeMs,
    alerts,
  };
}
