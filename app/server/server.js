import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/photo", async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.json({ error: "Missing ?name=" });

    const query = encodeURIComponent(name + " Kyiv"); // можна міняти місто
    const url = `https://www.google.com/search?tbm=isch&q=${query}`;

    const html = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    }).then(r => r.text());

    // 🔍 Парсимо URL фото
    const matches = [...html.matchAll(/src="(https:\/\/[^"]+?)"/g)];
    const photos = matches
      .map(m => m[1])
      .filter(link => link.includes("gstatic"))
      .slice(0, 5);

    res.json({ photos });
  } catch (err) {
    console.error("Server Error:", err);
    res.json({ photos: [] });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Server running on port", PORT));
