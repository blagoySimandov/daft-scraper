import { log } from "apify";
import puppeteer, { Browser, Page } from "puppeteer";
import { ANTI_BOT, HTTP_HEADERS, DAFT, SCRAPING, TIMEOUTS } from "../config";
import { parseHydrationData } from "../utils";
import type { RawListingsData, RawPropertyData } from "../models";

export interface CrawlerConfig {
  searchTerm: string;
  saleOrRent: string;
  maxProperties?: number;
  location?: string;
}

export class CrawlerService {
  private config: CrawlerConfig;
  private baseUrl: string;
  private delayMs: number;
  private browser: Browser | null = null;

  constructor(config: CrawlerConfig) {
    this.config = config;
    this.delayMs = SCRAPING.DEFAULT_DELAY_MS;
    this.baseUrl = this.buildSearchUrl();
  }

  private buildSearchUrl(): string {
    const { searchTerm, saleOrRent, location } = this.config;
    const area = location ? `/${location}` : "/ireland";
    const baseUrl = `${DAFT.DOMAIN}/property-for-${saleOrRent}${area}?adState=published`;
    return searchTerm
      ? `${baseUrl}&terms=${encodeURIComponent(searchTerm)}`
      : baseUrl;
  }

  private async simulateMouseMovements(page: Page): Promise<void> {
    log.debug(`Simulating ${TIMEOUTS.MOUSE_MOVEMENTS} mouse movements`);
    for (let i = 0; i < TIMEOUTS.MOUSE_MOVEMENTS; i++) {
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;
      await page.mouse.move(x, y);
      await new Promise((resolve) =>
        setTimeout(resolve, TIMEOUTS.MOUSE_MOVE_DELAY),
      );
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    log.info("Launching browser");
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    return this.browser;
  }

  private async closeBrowser(): Promise<void> {
    if (!this.browser) return;
    await this.browser.close();
    this.browser = null;
  }

  private async waitForHydration(page: Page): Promise<void> {
    const ready = await page.$(DAFT.HYDRATION_SELECTOR);
    if (ready) return;
    log.debug("Cloudflare challenge present, solving in browser");
    await this.simulateMouseMovements(page);
    await page.waitForSelector(DAFT.HYDRATION_SELECTOR, {
      timeout: TIMEOUTS.PAGE_LOAD,
    });
  }

  private async fetchPageHtml(url: string): Promise<string> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setUserAgent(HTTP_HEADERS["User-Agent"]);
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUTS.PAGE_LOAD,
      });
      await this.waitForHydration(page);
      return await page.content();
    } finally {
      await page.close();
    }
  }

  private async scrapeDetails(url: string): Promise<RawPropertyData> {
    const html = await this.fetchPageHtml(url);
    return parseHydrationData(html);
  }

  private async scrapeListingsPage(pageNumber: number): Promise<any[]> {
    const url = `${this.baseUrl}&page=${pageNumber}`;
    log.info(`Scraping page ${pageNumber}`);

    const html = await this.fetchPageHtml(url);
    const data: RawListingsData = parseHydrationData(html);
    const listings = data.props?.pageProps?.listings || [];
    log.info(`Found ${listings.length} listings on page ${pageNumber}`);

    return listings;
  }

  async scrapeAllProperties(): Promise<RawPropertyData[]> {
    const allProperties: RawPropertyData[] = [];
    let currentPage = SCRAPING.DEFAULT_START_PAGE;
    const maxProperties = this.config.maxProperties;

    log.info(`Starting scrape from: ${this.baseUrl}`);

    try {
      await this.scrapePages(allProperties, currentPage, maxProperties);
    } finally {
      await this.closeBrowser();
    }

    return allProperties;
  }

  private async scrapePages(
    allProperties: RawPropertyData[],
    currentPage: number,
    maxProperties: number | undefined,
  ): Promise<void> {
    while (true) {
      if (maxProperties && maxProperties > 0 && allProperties.length >= maxProperties) {
        log.info(`Reached max properties limit: ${maxProperties}`);
        break;
      }

      log.info(`Scraping page ${currentPage}`);

      try {
        const listings = await this.scrapeListingsPage(currentPage);

        if (listings.length === 0) {
          log.info("No more listings found");
          break;
        }

        const validListings = listings.filter(
          (listing) => listing.listing?.seoFriendlyPath,
        );

        for (
          let i = 0;
          i < validListings.length;
          i += ANTI_BOT.CONCURRENCY_LIMIT
        ) {
          if (maxProperties && maxProperties > 0 && allProperties.length >= maxProperties) break;

          const chunk = validListings.slice(i, i + ANTI_BOT.CONCURRENCY_LIMIT);

          const results = await Promise.allSettled(
            chunk.map(async (listing) => {
              if (maxProperties && maxProperties > 0 && allProperties.length >= maxProperties)
                return;

              const seoFriendlyPath = listing.listing?.seoFriendlyPath!;
              const propertyUrl = `${DAFT.DOMAIN}${seoFriendlyPath}`;

              try {
                await new Promise((resolve) =>
                  setTimeout(resolve, this.delayMs),
                );
                const propertyDetails = await this.scrapeDetails(propertyUrl);
                allProperties.push(propertyDetails);
                log.info(`Scraped ${allProperties.length} properties`);
              } catch (error) {
                log.debug(`Failed to scrape ${propertyUrl}: ${error}`);
              }
            }),
          );

          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            log.debug(`${failed} scrapes failed in this batch`);
          }
        }

        currentPage++;
      } catch (error) {
        log.error(`Failed to scrape page ${currentPage}`, {
          error: String(error),
        });
        break;
      }
    }
  }
}
