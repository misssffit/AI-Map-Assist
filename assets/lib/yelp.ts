import Constants from "expo-constants";

const YELP_API_KEY = Constants.expoConfig?.extra?.yelpApiKey;

export async function fetchYelpData(name: string, lat: number, lon: number) {
  try {
    if (!YELP_API_KEY) {
      console.log("❌ Немає ключа YELP API");
      return {};
    }

    const headers = {
      Authorization: `Bearer ${YELP_API_KEY}`,
    };

    const url =
      `https://api.yelp.com/v3/businesses/search?` +
      `term=${encodeURIComponent(name)}` +
      `&latitude=${lat}` +
      `&longitude=${lon}` +
      `&radius=200` + // 200 метрів — оптимально
      `&limit=1`;

    console.log("🌍 Yelp URL:", url);

    const res = await fetch(url, { headers });
    const data = await res.json();

    console.log("🔎 Yelp search result:", data);

    if (!data.businesses || data.businesses.length === 0) {
      return {};
    }

    const business = data.businesses[0];

    return {
      image: business.image_url || "",
      rating: business.rating || 4.5,
      description: business.categories?.[0]?.title || "",
      phone: business.phone || "",
      workingHours: business.hours?.[0]?.open || "",
    };
  } catch (err) {
    console.error("❌ Yelp fetch error:", err);
    return {};
  }
}