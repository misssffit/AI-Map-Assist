import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.post("/gemini/analyze", async (req, res) => {
  try {
    const { query } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const allowedCategories = [
      "catering.cafe",
      "catering.cafe.coffee_shop",
      "catering.restaurant",
      "catering.restaurant.pizza",
      "catering.fast_food",
      "catering.bar",
      "catering.pub",
      "entertainment.cinema",
      "park"
    ];

    const prompt = `
      Ти — система аналізу пошукових запитів для мобільного застосунку з картою.

      Завдання:
      1. Визначити категорію закладу ТІЛЬКИ із whitelist:
      ${allowedCategories.join("\n")}

      2. Витягнути 2–6 ключових слів, які описують:
      - атмосферу
      - тип закладу
      - особливі побажання
      - характеристики ("дешево", "романтичний", "з wi-fi", "робоча атмосфера, "грузинкьсий ресторан")

      3. Відповідати строго у JSON:
      {
        "category": "<одна категорія>",
        "keywords": ["слово1", "слово2", ...]
      }

      ❗ Заборони:
      - НЕ додавати нічого поза JSON
      - НЕ вигадувати категорій, яких нема у whitelist
      - НЕ повертати порожній keywords (мінімум 2 значення)

      КОРИСТУВАЦЬКИЙ ЗАПИТ:
      "${query}"
      `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Очищення JSON
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^[`\s\n\r]+|[`\s\n\r]+$/g, "")
      .trim();

    // Вирізання JSON
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("JSON not found");

    const jsonPart = text.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonPart);

    // 🔥 Гарантії стабільності:
    if (!allowedCategories.includes(parsed.category)) {
      parsed.category = "catering.cafe";
    }

    if (!Array.isArray(parsed.keywords) || parsed.keywords.length < 2) {
      parsed.keywords = [query, parsed.category]; 
    }

    res.json(parsed);

  } catch (e) {
    console.error("❌ analyze error:", e);
    res.json({ category: "catering.cafe", keywords: [] });
  }
});

app.post("/gemini/rank", async (req, res) => {
  try {
    const { places, keywords } = req.body;

    if (!places || !Array.isArray(places) || !keywords || !Array.isArray(keywords)) {
      return res.json(places || []);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const placeList = places
      .map(
        (p, i) =>
          `${i + 1}. Назва: ${p.name || "Невідомо"}; Категорія: ${p.category}; Опис: ${p.description}`
      )
      .join("\n");

    const prompt = `
      Ти аналізуєш заклади і сортуєш їх за відповідністю до ключових слів.

      Ключові слова користувача:
      ${keywords.join(", ")}

      Список закладів:
      ${placeList}

      Поверни **тільки JSON масив індексів**, наприклад:
      [3, 1, 2]

      ❗ Без пояснень, без тексту, без форматування.
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    console.log("🧠 RAW ranking response:", text);

    // чистимо HTML та markdown
    text = text.replace(/<[^>]*>/g, "");
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/\n/g, " ")
      .trim();

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;
    if (start === -1 || end === -1) throw new Error("JSON array not found");

    const jsonArray = text.substring(start, end);
    console.log("🟦 Extracted JSON:", jsonArray);

    const order = JSON.parse(jsonArray);
    if (!Array.isArray(order)) throw new Error("AI returned non-array");

    const ranked = order.map((index) => places[index - 1]).filter(Boolean);

    res.json(ranked.length > 0 ? ranked : places);
  } catch (e) {
    console.error("❌ Помилка при ранжуванні місць:", e);
    res.json(req.body.places || []);
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
app.post("/maps/places", async (req, res) => {
  try {
    const { lat, lon, category } = req.body;

    const url =
      `https://api.geoapify.com/v2/places?categories=${category}` +
      `&filter=circle:${lon},${lat},2500` +
      `&bias=proximity:${lon},${lat}` +
      `&limit=12&apiKey=${process.env.GEOAPIFY_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (err) {
    console.error("Geoapify error:", err);
    res.status(500).json({ error: "Geoapify server error" });
  }
});



app.get("/maps/tiles/:style/:z/:x/:y.png", async (req, res) => {
  try {
    const { style, z, x, y } = req.params;

    const tileUrl =
      `https://maps.geoapify.com/v1/tile/${style}/${z}/${x}/${y}.png?apiKey=${process.env.GEOAPIFY_KEY}`;

    const r = await fetch(tileUrl);
    const buffer = Buffer.from(await r.arrayBuffer());

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);

  } catch (e) {
    console.error("Tile proxy error:", e);
    res.status(500).send("Tile error");
  }
});

app.post("/maps/photo", async (req, res) => {
  const { name, lat, lon, categoryHints = [] } = req.body;
  const categoryText = categoryHints.join(" ");

  if (!name) return res.json("");
  
  const searchQuery = `${name} ${lat} ${lon} заклад меню інтерʼєр фото`;

  // 🔵 1. Скрейпер DuckDuckGo Images
  async function getDuckDuckGoImage() {
    try {
      const url = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iar=images&iax=images&ia=images`;
      const html = await fetch(url).then(r => r.text());
      const $ = cheerio.load(html);

      let img = null;
      $("img").each((i, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http")) {
          img = src;
          return false;
        }
      });

      return img;
    } catch (e) {
      return null;
    }
  }

  // 🔵 2. Скрейпер Bing Images
  async function getBingImage() {
    try {
      const url = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}`;
      const html = await fetch(url).then(r => r.text());
      const $ = cheerio.load(html);

      const img = $("img").first().attr("src");

      return img ? img : null;
    } catch (e) {
      return null;
    }
  }

  // 🔵 3. Скрейпер Google Images (обхід API)
  async function getGoogleImage() {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;
      const html = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }).then(r => r.text());

      const $ = cheerio.load(html);

      let img = null;
      $("img").each((i, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http")) {
          img = src;
          return false;
        }
      });

      return img;
    } catch (e) {
      return null;
    }
  }

  // 🟢 Викликаємо всі парсери паралельно
  const [googleImg, bingImg, duckImg] = await Promise.all([
    getGoogleImage(),
    getBingImage(),
    getDuckDuckGoImage(),
  ]);

  // 🟢 Вибір найкращого фото
  const finalImage = googleImg || bingImg || duckImg || "";

  res.json(finalImage);
});