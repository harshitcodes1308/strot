import { Lead, CompanyKnowledge } from "@prisma/client";

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 20,
};

export interface ConfidenceEvaluation {
  score: number; // Used for ranking
  completeness: number; // 0-100 based on required fields
  missingFields: string[];
  reasons: string[];
  isComplete: boolean;
  needsGoogleBusiness: boolean;
  needsWebsiteCrawl: boolean;
  needsContactCrawl: boolean;
  needsSocialSearch: boolean;
  needsEmailDiscovery: boolean;
}

const REQUIRED_SOCIAL_NETWORKS = ["instagram", "facebook", "linkedin", "twitter", "youtube", "tiktok"];

/**
 * Evaluates the completion and confidence score of a company based on the data available.
 */
export function evaluateCompanyConfidence(company: Partial<CompanyKnowledge>): ConfidenceEvaluation {
  const missingFields: string[] = [];
  const reasons: string[] = [];
  let score = 0;
  
  // 1. Business Name
  if (!company.name) {
    missingFields.push("Business Name");
  } else {
    score += 10;
  }

  // 2. Google Business Profile & Maps URL
  // We infer this if location is present and we scraped it from google or they have googleFreshness
  if (!company.googleFreshness) {
    missingFields.push("Google Business Profile");
    missingFields.push("Google Maps URL");
  } else {
    score += 20;
    reasons.push("Has Google Business Profile (+20)");
  }

  // 3. Website
  if (!company.domain) {
    missingFields.push("Website");
  } else {
    score += 15;
    reasons.push("Has valid domain (+15)");
  }

  // 4. Primary Email
  if (!company.emails || company.emails.length === 0) {
    missingFields.push("Primary Email");
  } else {
    score += 20;
    reasons.push(`Has ${company.emails.length} emails (+20)`);
  }

  // 5. Primary Phone
  if (!company.phones || company.phones.length === 0) {
    missingFields.push("Primary Phone");
  } else {
    score += 15;
    reasons.push(`Has phones (+15)`);
  }

  // 6. At least ONE verified social profile
  let hasValidSocial = false;
  if (company.socialProfiles) {
    const profiles = company.socialProfiles as Record<string, string>;
    for (const network of REQUIRED_SOCIAL_NETWORKS) {
      if (profiles[network]) {
        hasValidSocial = true;
        break;
      }
    }
  }

  if (!hasValidSocial) {
    missingFields.push("Verified Social Profile");
  } else {
    score += 20;
    reasons.push("Has verified social profile (+20)");
  }

  // Calculate Completeness %
  const totalRequired = 7; // Name, Google, Maps, Website, Email, Phone, Social
  const foundRequired = totalRequired - missingFields.length;
  const completeness = Math.round((foundRequired / totalRequired) * 100);

  const finalScore = Math.min(100, score);
  
  // Prevent infinite loops by checking if we recently tried (within 7 days)
  const isRecent = (date?: Date | null) => {
    if (!date) return false;
    const diffDays = (new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24);
    return diffDays < 7;
  };

  return {
    score: finalScore,
    completeness,
    missingFields,
    reasons,
    isComplete: completeness === 100,
    needsGoogleBusiness: !company.googleFreshness && !isRecent(company.googleFreshness),
    needsWebsiteCrawl: !!company.domain && !isRecent(company.websiteFreshness),
    needsContactCrawl: !!company.domain && (!company.emails?.length || !company.phones?.length) && !isRecent(company.contactFreshness),
    needsSocialSearch: !hasValidSocial && !isRecent(company.socialFreshness),
    needsEmailDiscovery: (!company.emails || company.emails.length === 0) && !isRecent(company.contactFreshness)
  };
}
