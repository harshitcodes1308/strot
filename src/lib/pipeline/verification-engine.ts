import { CompanyKnowledge } from "@prisma/client";

export interface VerificationResult {
  isValid: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export class VerificationEngine {
  /**
   * Verifies if a social profile belongs to the company.
   * Rejects fan pages, duplicates, and unrelated pages.
   */
  static verifySocialProfile(
    company: Partial<CompanyKnowledge>,
    profileContent: { name?: string; bio?: string; website?: string; phone?: string; username?: string }
  ): VerificationResult {
    let score = 0;
    const reasons: string[] = [];

    const normalize = (s?: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const cName = normalize(company.name);
    const pName = normalize(profileContent.name);
    const pUsername = normalize(profileContent.username);
    
    // 1. Name Match
    if (cName && (pName.includes(cName) || cName.includes(pName) || pUsername.includes(cName))) {
      score += 40;
      reasons.push("Name or username matches company name.");
    }

    // 2. Website / Domain Match
    if (company.domain && profileContent.website) {
      if (profileContent.website.toLowerCase().includes(company.domain.toLowerCase())) {
        score += 50;
        reasons.push("Profile website matches company domain.");
      }
    } else if (company.domain && profileContent.bio) {
      if (profileContent.bio.toLowerCase().includes(company.domain.toLowerCase())) {
        score += 30;
        reasons.push("Bio references company domain.");
      }
    }

    // 3. Phone Match
    if ((company as any).phones && (company as any).phones.length > 0 && profileContent.phone) {
      const cPhones = (company as any).phones.map(normalize);
      const pPhone = normalize(profileContent.phone);
      if (cPhones.includes(pPhone) || cPhones.some((c: string) => pPhone.includes(c) || c.includes(pPhone))) {
        score += 40;
        reasons.push("Profile phone matches company phone.");
      }
    } else if ((company as any).phones && (company as any).phones.length > 0 && profileContent.bio) {
      const cPhones = (company as any).phones.map(normalize);
      const bioNorm = normalize(profileContent.bio);
      if (cPhones.some((c: string) => bioNorm.includes(c) && c.length > 7)) {
        score += 20;
        reasons.push("Bio references company phone.");
      }
    }

    // 3.5 Location / City Match
    if (company.location && profileContent.bio) {
      const city = company.location.split(",")[0].trim().toLowerCase();
      if (city && city.length > 2 && profileContent.bio.toLowerCase().includes(city)) {
        score += 20;
        reasons.push("Bio mentions the company location/city.");
      }
    }

    // 4. Reject Fan Pages
    const bioLower = (profileContent.bio || "").toLowerCase();
    if (bioLower.includes("fan page") || bioLower.includes("unofficial") || bioLower.includes("parody")) {
      return {
        isValid: false,
        confidence: "low",
        reason: "Identified as a fan or unofficial page."
      };
    }

    if (score >= 50) {
      return { isValid: true, confidence: "high", reason: reasons.join(" ") };
    } else {
      return { isValid: false, confidence: "low", reason: "Not enough matching signals. Requires at least 50 points." };
    }
  }

  /**
   * Evaluates if an email is a strong match for the company.
   */
  static verifyEmail(company: Partial<CompanyKnowledge>, email: string): VerificationResult {
    const domain = email.split("@")[1];
    if (!domain) return { isValid: false, confidence: "low", reason: "Invalid email format." };

    if (company.domain && domain.toLowerCase() === company.domain.toLowerCase()) {
      return { isValid: true, confidence: "high", reason: "Email domain matches company domain exactly." };
    }

    // If it's a generic domain (gmail, yahoo) we need to check if the local part matches the company name
    const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
    if (genericDomains.includes(domain.toLowerCase())) {
      const localPart = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const cName = (company.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      
      if (cName && (localPart.includes(cName) || cName.includes(localPart))) {
        return { isValid: true, confidence: "medium", reason: "Generic email matches company name." };
      }
    }

    return { isValid: false, confidence: "low", reason: "Email domain does not match company." };
  }
}
