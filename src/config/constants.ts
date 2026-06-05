export const USER_AGENTS = {
  MACOS:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
} as const;

export const TIMEOUTS = {
  PAGE_LOAD: 60000,
  MOUSE_MOVE_DELAY: 100,
  MOUSE_MOVEMENTS: 20,
} as const;

export const ANTI_BOT = {
  CONCURRENCY_LIMIT: 5,
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
