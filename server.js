import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import { chromium } from "playwright";

function cleanText(text = "") {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function extractWithCheerio(html, url) {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $(
    "script, style, noscript, iframe, svg, nav, footer, header, aside"
  ).remove();

  const title = cleanText(
    $("title").first().text() ||
      $('meta[property="og:title"]').attr("content")
  );

  const description = cleanText(
    $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content")
  );

  // Prefer actual article/main content
  const mainContent =
    $("article").text() ||
    $("main").text() ||
    $('[role="main"]').text() ||
    $("body").text();

  const content = cleanText(mainContent);

  return {
    success: true,
    method: "axios-cheerio",
    title,
    description,
    content: content.slice(0, 20000),
    url,
  };
}

async function scrapeWithAxios(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  return extractWithCheerio(response.data, url);
}

async function scrapeWithPlaywright(url) {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Give JavaScript-rendered pages some time
    await page.waitForTimeout(2000);

    // Remove unwanted content
    await page.evaluate(() => {
      document
        .querySelectorAll(
          "script, style, noscript, iframe, svg, nav, footer, header, aside"
        )
        .forEach((element) => element.remove());
    });

    const data = await page.evaluate(() => {
      const getMeta = (selector) =>
        document.querySelector(selector)?.getAttribute("content") || "";

      const title =
        document.title ||
        getMeta('meta[property="og:title"]');

      const description =
        getMeta('meta[name="description"]') ||
        getMeta('meta[property="og:description"]');

      const main =
        document.querySelector("article") ||
        document.querySelector("main") ||
        document.querySelector('[role="main"]') ||
        document.body;

      return {
        title,
        description,
        content: main?.innerText || document.body.innerText,
      };
    });

    return {
      success: true,
      method: "playwright",
      title: cleanText(data.title),
      description: cleanText(data.description),
      content: cleanText(data.content).slice(0, 20000),
      url,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function scrapeWebsite(url) {
  try {
    // First try the fast method
    const result = await scrapeWithAxios(url);

    // If enough content was extracted, don't launch a browser
    if (result.content.length > 500) {
      return result;
    }

    console.log("Axios returned insufficient content. Using Playwright...");

    return await scrapeWithPlaywright(url);
  } catch (axiosError) {
    console.log(
      "Axios scraping failed:",
      axiosError.message
    );

    try {
      console.log("Trying Playwright...");

      return await scrapeWithPlaywright(url);
    } catch (playwrightError) {
      console.error(
        "Playwright scraping failed:",
        playwrightError.message
      );

      return {
        success: false,
        error: "Unable to scrape this website",
        details: playwrightError.message,
        url,
      };
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const handleScrapeRequest = async (req, res) => {
  const targetUrl = req.body?.url || req.query?.url;
  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: "URL is required (pass via JSON body { url } or query param ?url=...)",
    });
  }

  try {
    const result = await scrapeWebsite(targetUrl);
    if (!result.success) {
      return res.status(500).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Internal server error during scraping",
      details: err.message,
    });
  }
};

app.post("/scrape", handleScrapeRequest);
app.get("/scrape", handleScrapeRequest);

app.listen(PORT, () => {
  console.log(`Jarvis Scraper Backend running on http://localhost:${PORT}`);
});