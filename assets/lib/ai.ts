const BASE_URL = "https://ai-map-assist-1.onrender.com";

// 🔹 1) Аналізуємо текст запиту через бекенд
export async function analyzeQuery(query: string) {
  try {
    const response = await fetch(`${BASE_URL}/gemini/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    // очікуємо такий формат: { category: string, keywords: string[] }
    return data;
  } catch (e) {
    console.error("❌ Помилка виклику backend /gemini/analyze:", e);
    return { category: "catering.cafe", keywords: [] }; // fallback
  }
}

// 🔹 2) Ранжування місць через бекенд
export async function rankPlacesByRelevance(places: any[], keywords: string[]) {
  try {
    const response = await fetch(`${BASE_URL}/gemini/rank`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ places, keywords }),
    });

    const data = await response.json();
    // очікуємо масив закладів у вже відсортованому порядку
    return data;
  } catch (e) {
    console.error("❌ Помилка виклику backend /gemini/rank:", e);
    return places; // fallback
  }
}