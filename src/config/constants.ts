import dotenv from "dotenv";

dotenv.config();

export const BROWSER_CONFIG = {
  HEADLESS: true,
  ARGS: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
  ] as const,
} as const;

export const USER_AGENTS = {
  WINDOWS:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  MACOS:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
} as const;

export const TIMEOUTS = {
  PAGE_LOAD: 60000,
  NETWORK_IDLE: 10000,
  CLOUDFLARE_WAIT: 3000,
  MOUSE_MOVE_DELAY: 100,
  MOUSE_MOVEMENTS: 20,
  CLOUDFLARE_CHECKBOX_WAIT: 10000,
  AFTER_CHECKBOX_CLICK: 5000,
} as const;

export const ANTI_BOT = {
  MOUSE_MOVEMENTS: 20,
  CLOUDFLARE_COOKIE: "cf_clearance",
  CONCURRENCY_LIMIT: 5,
} as const;

export const WEBSHARE = {
  API_TOKEN: process.env.WEBSHARE || "",
} as const;

export const CAPSOLVER = {
  API_KEY: process.env.CAPSOLVER_API_KEY || "",
  CREATE_TASK_URL: "https://api.capsolver.com/createTask",
  GET_RESULT_URL: "https://api.capsolver.com/getTaskResult",
  TASK_TYPE: "AntiCloudflareTask",
  POLL_INTERVAL_MS: 1000,
  MAX_POLL_TIME_MS: 120000,
} as const;

export const SCRAPING = {
  DEFAULT_DELAY_MS: 500,
  DEFAULT_START_PAGE: 1,
  DEFAULT_END_PAGE: 24,
} as const;

export const DAFT = {
  DOMAIN: "https://www.daft.ie",
  DEFAULT_SEARCH: "derelict",
  DEFAULT_SALE_OR_RENT: "sale",
  HYDRATION_SELECTOR: "#__NEXT_DATA__",
} as const;

export const PATTERNS = {
  NEXT_DATA: /<script id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s,
  EIRCODE: /\b[A-Z]\d{2}\s?[A-Z0-9]{4}\b/g,
  FOLIO: /\bFolio\s+([A-Z]{2}\d+[A-Z]?)\b/gi,
  PRICE: /€?([\d,]+)/,
  NUMBER: /\d+/,
} as const;

export const UTILITIES = [
  ["mains water", /mains\s+water/],
  ["mains sewage", /mains\s+sewage/],
  ["septic tank", /septic\s+tank/],
  ["broadband", /broadband/],
  ["phone line", /phone\s+line/],
  ["electricity", /electricity/],
] as const;

export const LOCATION_PATTERNS = {
  SHORT_DRIVE: /(?:short drive|a few minutes) from ([^.,]+)/gi,
  WITHIN_HOUR: /within (?:an? )?hours? drive of ([^.,]+)/gi,
  CLOSE_BY: /close to ([^.,]+)/gi,
} as const;

export const HTTP_HEADERS = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "User-Agent": USER_AGENTS.MACOS,
  priority: "u=0, i",
  "sec-ch-ua":
    '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  "user-agent": USER_AGENTS.MACOS,
} as const;
