require('dotenv').config();
const apiKey = process.env.GOOGLE_PLACES_API_KEY;

async function run() {
  const allPlaces = [];
  let pageToken = undefined;
  
  for(let i=0; i<3; i++) {
    const body = {
      textQuery: "gym in delhi",
      maxResultCount: 20,
      languageCode: "en"
    };
    if (pageToken) body.pageToken = pageToken;
    
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.websiteUri,nextPageToken"
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log(`Page ${i+1}: Got ${data.places?.length || 0} places. Next token? ${!!data.nextPageToken}`);
    if (data.places) allPlaces.push(...data.places);
    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
      await new Promise(r => setTimeout(r, 2000));
    } else {
      break;
    }
  }
  console.log(`Total places: ${allPlaces.length}`);
  console.log(`Places with websites: ${allPlaces.filter(p => !!p.websiteUri).length}`);
}
run();
