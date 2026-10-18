# Jarvis Scraper Backend

A lightweight Node.js/Express service that scrapes and extracts clean text content from web pages for the Jarvis agent. It uses a fast HTTP+HTML parsing path first (`axios` + `cheerio`) and automatically falls back to a headless browser (`Playwright`/Chromium) for JavaScript-rendered or content-thin pages.

## Features

- **Dual-strategy scraping** — fast static fetch with automatic Playwright fallback.
- **Clean extraction** — strips scripts, styles, nav, footer, header, aside and normalizes whitespace.
- **Metadata** — returns page `title` and `description` (Open Graph fallbacks included).
- **Content limit** — extracted content is capped at 20,000 characters.
- **Flexible input** — accepts the target URL via JSON body or query string.
- **CORS enabled** — ready to be called from the mobile/frontend app.
- **Health check** endpoint for monitoring.

## Tech Stack

- Node.js (ES Modules)
- Express 5
- Axios
- Cheerio
- Playwright (Chromium)
- CORS

## Requirements

- Node.js 18+
- npm

## Installation

```bash
npm install
```

The `postinstall` script automatically downloads the Chromium browser used by Playwright:

```bash
npx playwright install chromium
```

## Running

```bash
npm start
```

The server starts on `http://localhost:3000` (override with the `PORT` environment variable):

```bash
PORT=8080 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=8080; npm start
```

## API

### `GET /health`

Returns service status.

**Response**

```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### `POST /scrape` or `GET /scrape`

Scrapes a given URL and returns extracted content.

**POST body**

```json
{ "url": "https://example.com" }
```

**GET query**

```
/scrape?url=https://example.com
```

**Success response**

```json
{
  "success": true,
  "method": "axios-cheerio",
  "title": "Example Domain",
  "description": "...",
  "content": "...",
  "url": "https://example.com"
}
```

`method` is either `axios-cheerio` (fast path) or `playwright` (browser fallback).

**Error response**

```json
{
  "success": false,
  "error": "Unable to scrape this website",
  "details": "...",
  "url": "https://example.com"
}
```

## How It Works

1. `scrapeWithAxios` fetches the raw HTML with a browser-like User-Agent and parses it with Cheerio.
2. If the extracted content is longer than 500 characters, that result is returned immediately.
3. Otherwise (or on failure), `scrapeWithPlaywright` launches headless Chromium, waits for the page to render, then extracts the visible text.
4. All text is cleaned and truncated to 20,000 characters before returning.

## Project Structure

```
backend/
├── server.js        # Express app, scraping logic, routes
├── package.json     # Dependencies and scripts
└── .gitignore
```

## Notes

- Playwright requires system dependencies; on Linux CI you may need `npx playwright install-deps`.
- Content extraction prioritizes `article`, `main`, or `[role="main"]` before falling back to the full body.
- Keep in mind target sites' terms of service and robots policies when scraping.
