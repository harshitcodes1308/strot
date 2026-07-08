// Export utils for CSV downloading

export function leadsToCSV(leads: any[]): string {
  const headers = [
    "Name", "Domain", "Industry", "Status", "Location",
    "Sources", "Saved At",
  ];

  const rows = leads.map(l => [
    l.name,
    l.domain ?? "",
    l.industry ?? "",
    l.status,
    l.location ?? "",
    l.sources ? l.sources.join("; ") : "",
    l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : "",
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadCSV(leads: any[], filename = "strot-leads.csv") {
  const csv = leadsToCSV(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
