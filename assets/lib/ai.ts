import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Аналізуємо текст запиту користувача
export async function analyzeQuery(query: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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

     try {
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text
        .replace(/```json/gi, "")  // видаляє ```json
        .replace(/```/g, "")       // видаляє всі потрійні бектики
        .replace(/^[`\s\n\r]+|[`\s\n\r]+$/g, "") // видаляє бектики й пробіли з початку/кінця
        .trim();
      console.log("🧠 AI raw response:", text);
      // 🩹 Витягуємо лише JSON-частину (між { і })
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("JSON not found in AI response");
      const jsonPart = text.substring(jsonStart, jsonEnd + 1);

      const parsed = JSON.parse(jsonPart);


      // Додаємо базові перевірки
      if (!parsed.category) parsed.category = "catering.cafe";
      if (!Array.isArray(parsed.keywords)) parsed.keywords = [];

      return parsed;
    } catch (e) {
      console.error("❌ Помилка розбору відповіді AI:", e);
      // 🔄 fallback — якщо AI не зміг відповісти у форматі JSON
      return { category: "catering.cafe", keywords: [] };
    }
}

export async function rankPlacesByRelevance(places: any[], keywords: string[]) {
  try {
    if (!places || places.length === 0 || !keywords || keywords.length === 0) {
      return places;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Список закладів для моделі
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

    // 🔵 ОЧИСТКА HTML (інколи Gemini повертає <p> або <html>)
    text = text.replace(/<[^>]*>/g, "");

    // 🔵 ОЧИСТКА markdown
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/\n/g, " ")
      .trim();

    // 🔵 Витягуємо JSON масив між [ ... ]
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;

    if (start === -1 || end === -1) throw new Error("JSON array not found");

    const jsonArray = text.substring(start, end);
    console.log("🟦 Extracted JSON:", jsonArray);

    const order = JSON.parse(jsonArray);

    if (!Array.isArray(order)) {
      throw new Error("AI returned non-array");
    }

    // 🟢 Сортуємо places
    const ranked = order.map((index) => places[index - 1]).filter(Boolean);

    return ranked.length > 0 ? ranked : places;
  } catch (e) {
    console.error("❌ Помилка при ранжуванні місць:", e);
    return places; // fallback — застосунок не падає
  }
}