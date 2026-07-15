import { db } from "@/lib/db";
import { normalizeDomain, jaroWinkler } from "@/scrapers/base";

export class EntityResolution {
  /**
   * Finds an existing CompanyKnowledge record or creates a new one.
   * Matches primarily on domain. If no domain is available, tries to match on name + location.
   */
  static async resolve(data: { name: string; domain?: string | null; location?: string | null }) {
    if (!data.name && !data.domain) {
      throw new Error("Must provide at least a name or domain to resolve entity.");
    }

    const normDomain = normalizeDomain(data.domain || null);

    if (normDomain) {
      // 1. Try to find by domain
      const existing = await db.companyKnowledge.findUnique({
        where: { domain: normDomain }
      });

      if (existing) {
        return existing;
      }

      // 2. Try to find by aliases (using raw query or just a basic findFirst since aliases is an array)
      const aliasMatch = await db.companyKnowledge.findFirst({
        where: {
          aliases: {
            has: normDomain
          }
        }
      });

      if (aliasMatch) return aliasMatch;
    }

    // 3. Try to find by name similarity if we have a name and location
    if (data.name) {
      // This is a simplistic approach for phase 1. A real system would use a dedicated search index (ElasticSearch/Typesense)
      // or trigram similarity in Postgres.
      const potentialMatches = await db.companyKnowledge.findMany({
        where: {
          OR: [
            { name: { equals: data.name, mode: "insensitive" } },
            // If location is provided, we could narrow it down
          ]
        },
        take: 10
      });

      for (const match of potentialMatches) {
        if (jaroWinkler(match.name, data.name) > 0.9) {
          if (data.location && match.location) {
             if (jaroWinkler(match.location, data.location) > 0.8) {
                 return match;
             }
          } else {
             // If one is missing location, we might still match if name is extremely similar
             if (jaroWinkler(match.name, data.name) > 0.95) return match;
          }
        }
      }
    }

    // 4. No match found, create a new one
    // Fallback domain: if no domain provided, we generate a fake one or just use name as a placeholder?
    // Wait, domain is unique. If no domain, we can't create it easily with a unique constraint unless it's null.
    // In schema, domain is String @unique. We need a dummy unique domain if it's missing, e.g., uuid.
    const newDomain = normDomain || `unknown-${Math.random().toString(36).substring(7)}.local`;

    const newCompany = await db.companyKnowledge.create({
      data: {
        name: data.name || "Unknown Company",
        domain: newDomain,
        location: data.location || null,
        aliases: normDomain ? [normDomain] : [],
      }
    });

    return newCompany;
  }
}
