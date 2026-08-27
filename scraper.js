import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeWebsite(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove things that usually aren't useful to the agent
    $("script").remove();
    $("style").remove();
    $("noscript").remove();
    $("nav").remove();
    $("footer").remove();

    const title = $("title").first().text().trim();

    const description =
      $('meta[name="description"]').attr("content")?.trim() || "";

    const content = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    return {
      success: true,
      title,
      description,
      content: content.slice(0, 15000),
      url,
    };
  } catch (error) {
    console.error("Scraping error:", error.message);

    return {
      success: false,
      error: "Unable to scrape this website.",
      url,
    };
  }
}