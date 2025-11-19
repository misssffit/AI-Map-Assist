import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import cheerio from "cheerio";
import fetch from "node-fetch";
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
    const prompt = `
      Ти — асистент для мобільного застосунку з картою.
      Завдання: зрозуміти, що саме шукає користувач.

      Користувач вводить запит природною мовою, наприклад:
      - "затишне кафе з Wi-Fi та розетками"
      - "дешевий ресторан піци, який працює допізна"
      - "романтичний бар з живою музикою"

      Твоє завдання:
      1. Визнач одну найбільш відповідну категорію Geoapify 
        (наприклад: catering.cafe, catering.restaurant, catering.bar, entertainment.cinema, accommodation.hotel, park, shop тощо)
      2. Витягни 2–5 ключових слів, які описують, що користувач хоче знайти 
        (наприклад: "затишне", "wifi", "дешево", "романтичне", "тихо", "пізно працює").
      3. Відповідай **тільки** у форматі JSON, без жодного тексту навколо:
        {
          "category": "catering.cafe",
          "keywords": ["затишне", "wifi", "тихе"]
        }

      Користувацький запит: "${query}"
      (Використовуй українську мову, якщо можливо)
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // твої ж очищення:
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^[`\s\n\r]+|[`\s\n\r]+$/g, "")
      .trim();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("JSON not found in AI response");
    const jsonPart = text.substring(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(jsonPart);

    if (!parsed.category) parsed.category = "catering.cafe";
    if (!Array.isArray(parsed.keywords)) parsed.keywords = [];

    res.json(parsed);
  } catch (e) {
    console.error("❌ Помилка розбору відповіді AI:", e);
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
  const { name } = req.body;

  if (!name) return res.json("");

  const searchQuery = `${name} фото`;

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