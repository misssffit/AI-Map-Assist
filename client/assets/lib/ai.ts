const BASE_URL = "https://ai-map-assist-1.onrender.com";

/* 
  1) 🧠 Аналіз тексту запиту через Gemini
     Повертає:
     {
       category?: string,        // опціонально
       keywords: string[]        // ключові слова для ранжування
     }
*/
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
    return {
      category: data.category || null,
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
    };
  } catch (e) {
    console.error("❌ Помилка виклику backend /gemini/analyze:", e);
    return { category: null, keywords: [] }; // fallback для Google Places
  }
}

/*
  2) 🧠 Ранжування закладів
     – передаємо масив Google Places
     – Gemini повертає відсортований масив
*/
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
    
    // очікуємо масив відсортованих place-об’єктів
    if (Array.isArray(data)) {
      return data;
    }

    console.warn("⚠️ Некоректний формат ранжування:", data);
    return places;
  } catch (e) {
    console.error("❌ Помилка виклику backend /gemini/rank:", e);
    return places; // fallback
  }
}
