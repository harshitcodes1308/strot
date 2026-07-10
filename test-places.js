const apiKey = process.env.GOOGLE_PLACES_API_KEY;

async function test() {
  const body = {
    textQuery: "gym in delhi",
    maxResultCount: 20,
    languageCode: "en",
  };
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.primaryType",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
