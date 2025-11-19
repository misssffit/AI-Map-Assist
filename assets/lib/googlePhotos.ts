import Constants from "expo-constants";

const SERP_KEY = Constants.expoConfig?.extra?.serpApiKey;

export async function getGooglePhoto(placeName, lat, lon) {
  try {
    const query = encodeURIComponent(placeName);
    const url =
      `https://serpapi.com/search.json?engine=google_maps` +
      `&q=${query}` +
      `&ll=@${lat},${lon},14z` +
      `&google_maps_url=` +
      `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` +
      `&api_key=${SERP_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    // ⚠️ SerpAPI може повертати різні ключі
    const photos =
      data.search_metadata?.google_maps_photos ||
      data.photos ||
      data?.images_results ||
      data?.place_results?.photos ||
      [];

    if (Array.isArray(photos) && photos.length > 0) {
      return photos[0].photo_url;
    }

    return "";
  } catch (e) {
    console.log("SerpAPI ERROR:", e);
    return "";
  }
}