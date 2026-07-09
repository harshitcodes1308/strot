/**
 * CSV export utilities for lead data.
 * Extracted from the former mock-data.ts.
 * @module
 */

interface ExportableLead {
  name: string;
  domain?: string | null;
  industry?: string | null;
  status: string;
  location?: string | null;
  sources?: string[];
  createdAt?: string | Date;
}

/** Convert an array of leads to a CSV string */
export function leadsToCSV(leads: ExportableLead[]): string {
  const headers = [
    "Name", "Domain", "Industry", "Status", "Location",
    "Sources", "Saved At",
  ];

  const rows = leads.map((l) => [
    l.name,
    l.domain ?? "",
    l.industry ?? "",
    l.status,
    l.location ?? "",
    l.sources ? l.sources.join("; ") : "",
    l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : "",
  ]);

  return [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

/** Trigger a CSV download in the browser */
export function downloadCSV(
  leads: ExportableLead[],
  filename = "strot-leads.csv"
): void {
  const csv = leadsToCSV(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
