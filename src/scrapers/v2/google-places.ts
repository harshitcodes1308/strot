export interface GooglePlaceResult {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
  regularOpeningHours?: { weekdayDescriptions: string[] };
  photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
  reviews?: Array<{ text?: { text: string } }>;
}

export interface V2PlaceData {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number;
  reviewCount: number;
  category: string;
  reviews: string[];
  photoUrls: string[];
}

export class V2GooglePlacesScraper {
  private apiKey: string;

  constructor() {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_PLACES_API_KEY is missing in environment variables.");
    }
    this.apiKey = key;
  }

  async search(query: string, location: string | undefined, limit: number): Promise<V2PlaceData[]> {
    const textQuery = [query, location].filter(Boolean).join(" in ");
    const allPlaces: GooglePlaceResult[] = [];
    let pageToken: string | undefined = undefined;

    while (allPlaces.length < limit) {
      const body: any = {
        textQuery,
        maxResultCount: Math.min(20, limit - allPlaces.length > 0 ? 20 : limit - allPlaces.length), 
        languageCode: "en",
      };
      
      if (pageToken) {
        body.pageToken = pageToken;
      }

      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.rating",
            "places.userRatingCount",
            "places.primaryType",
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.businessStatus",
            "places.regularOpeningHours.weekdayDescriptions",
            "places.photos",
            "places.reviews",
            "nextPageToken",
          ].join(","),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const msg = `[V2 GooglePlaces] API error: ${response.status} ${await response.text()}`;
        console.error(msg);
        throw new Error(msg);
      }

      const data = await response.json() as { places?: GooglePlaceResult[], nextPageToken?: string };
      
      if (data.places && data.places.length > 0) {
        allPlaces.push(...data.places);
      } else {
        // No more results
        break;
      }

      if (data.nextPageToken && allPlaces.length < limit) {
        pageToken = data.nextPageToken;
        // Google requires a short delay before using nextPageToken
        await new Promise(r => setTimeout(r, 2000));
      } else {
        break;
      }
    }

    // Limit precisely to the requested number
    const finalPlaces = allPlaces.slice(0, limit);

    return finalPlaces.map(place => this.normalizePlace(place));
  }

  private normalizePlace(place: GooglePlaceResult): V2PlaceData {
    const category = place.primaryType ? place.primaryType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Unknown";
    
    let photoUrls: string[] = [];
    if (place.photos && place.photos.length > 0) {
      photoUrls = place.photos.slice(0, 6).map(p => 
        `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=800&maxWidthPx=800&key=${this.apiKey}`
      );
    }

    const rawReviews = (place.reviews || [])
      .map(r => r.text?.text)
      .filter(Boolean) as string[];

    return {
      placeId: place.id,
      name: place.displayName?.text || "Unknown",
      address: place.formattedAddress || "",
      phone: place.nationalPhoneNumber || null,
      website: place.websiteUri || null,
      rating: place.rating || 0,
      reviewCount: place.userRatingCount || 0,
      category,
      reviews: rawReviews,
      photoUrls,
    };
  }
}
