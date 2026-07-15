import { db } from "@/lib/db";
import { V2GooglePlacesScraper } from "./google-places";
import { V2WebsiteScraper } from "./website-scraper";
import { V2SocialScraper } from "./social-scraper";
import { IterativeSerpEngine } from "../iterative-serp";

export class V2ScraperOrchestrator {
  private placesScraper = new V2GooglePlacesScraper();
  private websiteScraper = new V2WebsiteScraper();
  private socialScraper = new V2SocialScraper();
  private DAILY_LIMIT = 999999; // Set to effectively infinite for testing phase

  async runSearch(params: {
    runId: string;
    query: string;
    location?: string;
    limit: number;
    workspaceId: string;
    userId: string;
  }): Promise<{ addedCount: number; message: string }> {
    // 1. Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leadsGeneratedToday = await db.lead.count({
      where: {
        workspaceId: params.workspaceId,
        scrapedAt: {
          gte: today,
        },
        source: "google_places_v2"
      }
    });

    const remainingAllowance = Math.max(0, this.DAILY_LIMIT - leadsGeneratedToday);
    
    if (remainingAllowance <= 0) {
      return { addedCount: 0, message: "Daily limit of 25 leads reached." };
    }

    const actualLimit = Math.min(params.limit, remainingAllowance);

    // 2. Discover via Google Places API (Fetch 3x buffer to account for strict filtering)
    console.log(`[V2Orchestrator] Searching for '${params.query}' in '${params.location}' (Target: ${actualLimit})`);
    const places = await this.placesScraper.search(params.query, params.location, actualLimit * 3);
    
    if (places.length === 0) {
      return { addedCount: 0, message: "No places found." };
    }

    let addedCount = 0;

    // 3. Process each place
    for (const place of places) {
      if (addedCount >= actualLimit) {
        break; // Double check just in case
      }

      console.log(`[V2Orchestrator] Processing place: ${place.name}`);
      let emails: string[] = [];
      let phones: string[] = place.phone ? [place.phone] : [];
      let socialProfiles: any = {};
      const domain = place.website ? place.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : null;

      if (place.website) {
        console.log(`[V2Orchestrator] Scraping website for contact info: ${place.website}`);
        const webData = await this.websiteScraper.scrape(place.website);
        
        emails = [...emails, ...webData.emails];
        phones = [...phones, ...webData.phones];
        // We INTENTIONALLY IGNORE webData.socials to avoid generic wix/wordpress links.
      }

      console.log(`[V2Orchestrator] Running SERP Engine for official socials & emails: ${place.name}`);
      const serpResults = await IterativeSerpEngine.discover({
        name: place.name,
        domain: domain || undefined,
        location: place.address,
        phones: phones,
      });

      emails = [...emails, ...serpResults.newEmails];
      socialProfiles = serpResults.newSocials;

      const socialsFound = Object.keys(socialProfiles).length > 0;
      if (socialsFound) {
        console.log(`[V2Orchestrator] Deep scraping verified socials for: ${place.name}`);
        const socialEmails = await this.socialScraper.scrape(socialProfiles);
        emails = [...emails, ...socialEmails];
      }

      // Deduplicate emails and phones
      emails = Array.from(new Set(emails));
      phones = Array.from(new Set(phones));

      // Quality Filter: Strict requirement (website + (email OR phone))
      // Note: We no longer require a social profile to exist, because strict verification means many real businesses fail the social check.
      const hasContactMethod = emails.length > 0 || phones.length > 0;
      if (!place.website || !hasContactMethod) {
        console.log(`[V2Orchestrator] Skipping ${place.name}: Missing strict required data points (Needs Website and either Email or Phone).`);
        continue;
      }

      // 4. Save to Database as a RawScraperResult for the UI to pick up
      const searchResult = {
        id: `google_places_v2_${place.placeId}`,
        name: place.name,
        domain: domain,
        description: `${place.category} - ${place.address}. ${place.rating}★ (${place.reviewCount} reviews).`,
        source: "google_places_v2",
        sourceUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`,
        profileUrl: place.website,
        socialProfiles: socialProfiles,
        sources: ["google_places_v2"],
        emails: emails,
        phones: phones,
        photos: place.photoUrls,
        location: place.address,
        industry: place.category,
        rating: place.rating,
        reviewCount: place.reviewCount,
        hasWebsite: !!place.website,
        dataCompleteness: this.computeCompleteness({ 
          emails, phones, socialProfiles, hasWebsite: !!place.website 
        }),
        google: {
          placeId: place.placeId,
          rating: place.rating,
          reviewCount: place.reviewCount,
          category: place.category,
          address: place.address,
          phone: place.phone,
          website: place.website,
          reviews: place.reviews,
        },
      };

      await db.rawScraperResult.create({
        data: {
          scraperRunId: params.runId,
          source: "google_places_v2",
          rawData: searchResult as any,
          processedAt: new Date(),
        }
      });

      addedCount++;
    }

    return { addedCount, message: `Successfully added ${addedCount} leads.` };
  }

  private computeCompleteness(data: any): number {
    let score = 30; // base for name and place data
    if (data.emails && data.emails.length > 0) score += 25;
    if (data.phones && data.phones.length > 0) score += 15;
    if (data.socialProfiles && Object.keys(data.socialProfiles).length > 0) score += 15;
    if (data.hasWebsite) score += 15;
    return Math.min(100, score);
  }
}
