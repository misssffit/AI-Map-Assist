import Constants from "expo-constants";

const FOURSQUARE_API_KEY = Constants.expoConfig?.extra?.foursquareApiKey;

const CATEGORY_MAP: Record<string, string> = {
  "catering.cafe": "13032",
  "catering.cafe.coffee_shop": "13035",
  "catering.restaurant": "13065",
  "catering.restaurant.pizza": "13026",
  "catering.bar": "13003",
  "catering.pub": "13044",
  "catering.fast_food": "13040",
  "catering.fast_food.sandwich": "13040",
};

export async function fetchFoursquareData(p: {
  name: string;
  lat: number;
  lon: number;
  category: string;
}) {
  try {
    if (!FOURSQUARE_API_KEY) {
      console.log("❌ Foursquare key missing");
      return {};
    }

    const categoryId = CATEGORY_MAP[p.category] || "13065"; // default: restaurant

    const url =
      `https://api.foursquare.com/v3/places/search?` +
      `ll=${p.lat},${p.lon}` +
      `&radius=150` +
      `&limit=1` +
      `&categories=${categoryId}`;

    console.log("🌍 FSQ URL:", url);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: FOURSQUARE_API_KEY, // no Bearer!
      },
    });

    const data = await res.json();
    console.log("🔎 FSQ search result:", data);

    if (!data.results || data.results.length === 0) {
      return {};
    }

    const place = data.results[0];
    const fsqId = place.fsq_id;

    // 🖼 ФОТО
    const photosUrl = `https://api.foursquare.com/v3/places/${fsqId}/photos`;
    const photosRes = await fetch(photosUrl, {
      headers: {
        Accept: "application/json",
        Authorization: FOURSQUARE_API_KEY,
      },
    });

    const photos = await photosRes.json();

    console.log("📸 FSQ photos:", photos);

    const photo =
      Array.isArray(photos) && photos.length > 0
        ? `${photos[0].prefix}original${photos[0].suffix}`
        : "";

    return {
      image: photo,
      description: place.categories?.[0]?.name || "",
    };
  } catch (err) {
    console.error("❌ Foursquare error:", err);
    return {};
  }
}