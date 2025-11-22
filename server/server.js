import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GOOGLE_KEY) {
  console.warn("⚠️ GOOGLE_MAPS_API_KEY не заданий в .env");
}
if (!GEMINI_KEY) {
  console.warn("⚠️ GEMINI_API_KEY не заданий в .env");
}

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// ─────────────────────────────────────────────
// 1) Gemini: аналізуємо текст запиту користувача
//    /gemini/analyze
// ─────────────────────────────────────────────
app.post("/gemini/analyze", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.json({ category: null, keywords: [] });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Ти — система аналізу пошукових запитів для мобільного застосунку з картою.

      Користувач вводить запит природною мовою, наприклад:
      - "затишне кафе з Wi-Fi та розетками для роботи"
      - "бар з живою музикою і коктейлями"
      - "місце для ранкової пробіжки в парку"

      Твоє завдання:
      1) Виділити тип закладу (категорію) коротким рядком, наприклад:
         "cafe", "bar", "restaurant", "park", "gym", "co-working".
      2) Виділити 2–6 ключових слів, які описують побажання користувача
         (атмосфера, бюджет, Wi-Fi, тиша, спорт, краєвид, романтика, тощо).

      Формат відповіді строго JSON без пояснень:
      {
        "category": "cafe",
        "keywords": ["затишне", "wifi", "розетки", "для роботи"]
      }

      Користувацький запит:
      "${query}"
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Прибираємо можливі ```json ... ```
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}") + 1;
    if (start === -1 || end === -1) {
      throw new Error("JSON not found in Gemini response");
    }

    const jsonPart = text.substring(start, end);
    const parsed = JSON.parse(jsonPart);

    const category = typeof parsed.category === "string" ? parsed.category : null;
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];

    res.json({
      category,
      keywords,
    });
  } catch (e) {
    console.error("❌ Помилка /gemini/analyze:", e);
    res.json({ category: null, keywords: [] });
  }
});

// ─────────────────────────────────────────────
// 2) Gemini: ранжуємо місця по релевантності
//    /gemini/rank
// ─────────────────────────────────────────────
app.post("/gemini/rank", async (req, res) => {
  try {
    const { places, keywords } = req.body;

    if (!Array.isArray(places) || !Array.isArray(keywords) || keywords.length === 0) {
      return res.json(places || []);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const placeList = places
      .map((p, i) => {
        const line = [
          `#${i + 1}`,
          `Назва: ${p.name || "Невідомо"}`,
          `Адреса: ${p.address || p.vicinity || ""}`,
          `Категорія: ${p.category || (p.types && p.types[0]) || ""}`,
        ].join("; ");
        return line;
      })
      .join("\n");

    const prompt = `
      Ти допомагаєш відсортувати список закладів за релевантністю до запиту користувача.

      Ключові слова користувача:
      ${keywords.join(", ")}

      Нижче список закладів (кожен з номером #N):

      ${placeList}

      Поверни тільки JSON-масив з номерами закладів у порядку від найбільш релевантного до найменш релевантного.
      Приклад:
      [3, 1, 2, 4]

      Без пояснень, тільки JSON масив чисел.
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;
    if (start === -1 || end === -1) {
      throw new Error("JSON array not found in Gemini response");
    }

    const arrPart = text.substring(start, end);
    const indices = JSON.parse(arrPart);

    if (!Array.isArray(indices)) {
      throw new Error("Gemini returned non-array");
    }

    const ranked = indices
      .map((idx) => {
        const i = Number(idx) - 1;
        return places[i];
      })
      .filter(Boolean);

    if (!ranked.length) {
      return res.json(places);
    }

    res.json(ranked);
  } catch (e) {
    console.error("❌ Помилка /gemini/rank:", e);
    res.json(req.body.places || []);
  }
});

// ─────────────────────────────────────────────
// 3) Google Places: Nearby Search
//    /places/search
// ─────────────────────────────────────────────
app.post("/places/search", async (req, res) => {
  try {
    const { lat, lon, keyword, radius = 2500 } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ error: "lat/lon required" });
    }

    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${lat},${lon}` +
      `&radius=${radius}` +
      (keyword ? `&keyword=${encodeURIComponent(keyword)}` : "") +
      `&key=${GOOGLE_KEY}`;

    console.log("🌐 Google Places Nearby URL:", url);

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.error_message) {
      console.error("Google Places error:", data.error_message);
    }

    res.json(data.results || []);
  } catch (err) {
    console.error("❌ /places/search error:", err);
    res.status(500).json({ error: "places search failed" });
  }
});

// ─────────────────────────────────────────────
// 4) Google Places: Фото (photo_reference → URL)
//    /places/photo
// ─────────────────────────────────────────────
app.post("/places/photo", async (req, res) => {
  try {
    const { photoReference, maxwidth = 800 } = req.body;

    if (!photoReference) {
      return res.json({ url: "" });
    }

    const photoUrl =
      `https://maps.googleapis.com/maps/api/place/photo?` +
      `maxwidth=${maxwidth}` +
      `&photo_reference=${photoReference}` +
      `&key=${GOOGLE_KEY}`;

    // Ми не проксімо саму картинку, а віддаємо клієнту URL
    res.json({ url: photoUrl });
  } catch (e) {
    console.error("❌ /places/photo error:", e);
    res.json({ url: "" });
  }
});

// ─────────────────────────────────────────────
// 5) (Опціонально наперед) Деталі місця + AI-опис
//    /places/details
//    /ai/describePlace
// ─────────────────────────────────────────────

// Деталі місця
app.post("/places/details", async (req, res) => {
  try {
    const { placeId } = req.body;

    if (!placeId) return res.status(400).json({ error: "placeId required" });

    const url =
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}` +
      `&fields=name,rating,formatted_address,opening_hours,photos,geometry,formatted_phone_number,website,types` +
      `&key=${GOOGLE_KEY}`;

    const resp = await fetch(url);
    const data = await resp.json();

    res.json(data.result || {});
  } catch (e) {
    console.error("❌ /places/details error:", e);
    res.status(500).json({ error: "details failed" });
  }
});

// AI-опис місця
app.post("/ai/describePlace", async (req, res) => {
  try {
    const { name, address, rating, keywords = [] } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Напиши розширений, але лаконічний опис закладу для мобільного застосунку.
      Обов'язково українською.

      Назва: ${name}
      Адреса: ${address}
      Рейтинг: ${rating || "без рейтингу"}
      Побажання користувача (ключові слова): ${keywords.join(", ")}

      У тексті коротко розкажи:
      – Яка там атмосфера?
      – Для кого підходить (робота, побачення, сім'я, спорт, прогулянки)?
      – Які основні плюси саме для такого запиту користувача?
      – Що робить це місце особливим?

      Не використовуй списки, просто 1–2 абзаци тексту.
    `;

    const result = await model.generateContent(prompt);
    const description = result.response.text().trim();

    res.json({ description });
  } catch (e) {
    console.error("❌ /ai/describePlace error:", e);
    res.json({ description: "" });
  }
});

// ─────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
