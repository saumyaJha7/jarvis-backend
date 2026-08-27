import express from "express";
import cors from "cors";
import { scrapeWebsite } from "./scraper.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Jarvis scraper backend is running",
  });
});

app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "URL is required",
    });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({
      success: false,
      error: "Invalid URL",
    });
  }

  const result = await scrapeWebsite(url);

  res.json(result);
});

// IMPORTANT: Render provides PORT
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});