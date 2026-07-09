export function guessEmails(name: string, domain: string): string[] {
  if (!name || !domain || !domain.includes(".")) return [];

  // Remove generic suffixes and clean up domain
  const cleanDomain = domain.replace(/^www\./, "").toLowerCase().trim();
  
  // Clean up name and split into parts
  const cleanName = name.replace(/[^\w\s-]/g, "").trim().toLowerCase();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return [];

  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const initialFirst = first.charAt(0);
  const initialLast = last ? last.charAt(0) : "";

  const patterns = new Set<string>();

  // If we only have one name (e.g., a mononym or just a first name)
  if (!last) {
    patterns.add(`${first}@${cleanDomain}`);
    patterns.add(`info@${cleanDomain}`);
    patterns.add(`contact@${cleanDomain}`);
    patterns.add(`hello@${cleanDomain}`);
    patterns.add(`support@${cleanDomain}`);
    patterns.add(`sales@${cleanDomain}`);
    return Array.from(patterns);
  }

  // 1. first@domain.com (Very common in startups/agencies)
  patterns.add(`${first}@${cleanDomain}`);
  
  // 2. first.last@domain.com (Very common in enterprise)
  patterns.add(`${first}.${last}@${cleanDomain}`);
  
  // 3. f.last@domain.com
  patterns.add(`${initialFirst}.${last}@${cleanDomain}`);
  
  // 4. flast@domain.com
  patterns.add(`${initialFirst}${last}@${cleanDomain}`);
  
  // 5. firstlast@domain.com
  patterns.add(`${first}${last}@${cleanDomain}`);
  
  // 6. firstl@domain.com
  patterns.add(`${first}${initialLast}@${cleanDomain}`);

  // 7. first_last@domain.com
  patterns.add(`${first}_${last}@${cleanDomain}`);

  return Array.from(patterns);
}
