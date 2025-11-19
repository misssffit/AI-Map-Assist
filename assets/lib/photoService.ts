// assets/lib/photoService.ts
import Constants from "expo-constants";

// 1️⃣ — Pexels key
const PEXELS_API_KEY = Constants.expoConfig?.extra?.pexelsApiKey;

// ------------------------
// 🅰️ GEOAPIFY PHOTO
// ------------------------
export function getGeoapifyPhoto(raw: any): string {
  try {
    if (!raw) return "";

    // Найчастіше фото буває тут
    if (raw.image) return raw.image;

    // Іноді буває тут (у різних джерелах)
    if (raw.datasource?.raw?.image) return raw.datasource.raw.image;

    // Деякі місця мають поле "images"
    if (Array.isArray(raw.images) && raw.images.length > 0) {
      return raw.images[0];
    }

    return "";
  } catch {
    return "";
  }
}

// ------------------------
// 🅱️ WIKIDATA PHOTO
// ------------------------
export async function getWikidataPhoto(wikidataId: string) {
  try {
    if (!wikidataId) return "";

    const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;

    const res = await fetch(url);
    const data = await res.json();

    const entity = data.entities[wikidataId];
    if (!entity || !entity.claims || !entity.claims.P18) return "";

    // Фото у форматі "File:Something.jpg"
    const fileName = entity.claims.P18[0].mainsnak.datavalue.value;

    // Пряме посилання на картинку
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
      fileName
    )}`;
  } catch (e) {
    console.log("Wikidata error:", e);
    return "";
  }
}

// ------------------------
// 🅾️ PEXELS FALLBACK (CATEGORY PHOTO)
// ------------------------
export async function getPexelsPhoto(query: string) {
  try {
    if (!PEXELS_API_KEY) {
      console.log("❌ Немає Pexels API ключа");
      return "";
    }

    const url =
      "https://api.pexels.com/v1/search?" +
      `query=${encodeURIComponent(query)}` +
      "&per_page=1&page=1";

    const res = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    const data = await res.json();
    if (!data.photos || data.photos.length === 0) return "";

    return data.photos[0].src.landscape || data.photos[0].src.medium;
  } catch (e) {
    console.log("Pexels error:", e);
    return "";
  }
}

// ------------------------
// 🔥 MAIN FUNCTION
// ------------------------
export async function getBestPhoto(place: any): Promise<string> {
  try {
    // 1️⃣ пробуємо Geoapify
    const geoPhoto = getGeoapifyPhoto(place.raw);
    if (geoPhoto) {
      return geoPhoto;
    }

    // 2️⃣ пробуємо Wikidata, якщо є ID
    const wikidataId =
      place.raw?.datasource?.raw?.wikidata ||
      place.raw?.datasource?.wikidata;

    if (wikidataId) {
      const wikiPhoto = await getWikidataPhoto(wikidataId);
      if (wikiPhoto) {
        return wikiPhoto;
      }
    }

    // 3️⃣ Pexels fallback — шукаємо по категорії або ключовому слову AI
    const category = place.category || "cafe";
    const fallbackQuery = category.includes(".")
      ? category.split(".").pop()
      : category;

    const pexelsPhoto = await getPexelsPhoto(fallbackQuery || "restaurant");

    return pexelsPhoto;
  } catch (e) {
    console.log("getBestPhoto ERROR:", e);
    return "";
  }
}