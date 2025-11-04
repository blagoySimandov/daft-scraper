import puppeteer, { Page } from "puppeteer";
import axios from "axios";
import { log } from "apify";
import {
  BROWSER_CONFIG,
  USER_AGENTS,
  TIMEOUTS,
  ANTI_BOT,
  HTTP_HEADERS,
  DAFT,
  SCRAPING,
} from "../config";
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

  constructor(config: CrawlerConfig) {
    this.config = config;
    this.delayMs = SCRAPING.DEFAULT_DELAY_MS;
    this.baseUrl = this.buildSearchUrl();
  }

  private buildSearchUrl(): string {
    const { searchTerm, saleOrRent, location } = this.config;
    const area = location ? `/${location}` : "/ireland";
    return `${DAFT.DOMAIN}/property-for-${saleOrRent}${area}?adState=published&terms=${encodeURIComponent(searchTerm)}`;
  }

  private async simulateMouseMovement(page: Page): Promise<void> {
    log.debug("Simulating mouse movement");
    for (let i = 0; i < ANTI_BOT.MOUSE_MOVEMENTS; i++) {
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;
      await page.mouse.move(x, y);
      await new Promise((resolve) =>
        setTimeout(resolve, TIMEOUTS.MOUSE_MOVE_DELAY),
      );
    }
  }

  private async extractChallengeCookie(page: Page): Promise<string> {
    const cookies = await page.cookies();
    const cfClearance = cookies.find(
      (cookie) => cookie.name === ANTI_BOT.CLOUDFLARE_COOKIE,
    );
    if (!cfClearance) {
      throw new Error("cf_clearance cookie not found");
    }
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  }

  private async scrapeDetailsWithCookie(
    url: string,
    challengeCookie: string,
  ): Promise<RawPropertyData> {
    const response = await axios.get(url, {
      headers: {
        ...HTTP_HEADERS,
        cookie: challengeCookie,
      },
    });
    return parseHydrationData(response.data);
  }

  private async scrapeListingsPage(
    pageNumber: number,
  ): Promise<{ listings: any[]; challengeCookie: string }> {
    const url = `${this.baseUrl}&page=${pageNumber}`;
    log.info(`Opening browser for page ${pageNumber}`);

    const browser = await puppeteer.launch({
      headless: BROWSER_CONFIG.HEADLESS,
      args: BROWSER_CONFIG.ARGS,
    });
    log.debug("Browser launched");

    try {
      const page = await browser.newPage();
      log.debug("New page created");

      await page.setUserAgent(USER_AGENTS.WINDOWS);
      log.info(`Navigating to ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: TIMEOUTS.PAGE_LOAD,
      });
      log.debug("Page loaded");

      await this.simulateMouseMovement(page);

      log.debug("Waiting for Cloudflare challenge");
      await new Promise((resolve) =>
        setTimeout(resolve, TIMEOUTS.CLOUDFLARE_WAIT),
      );

      await page.waitForNetworkIdle({ timeout: TIMEOUTS.NETWORK_IDLE });
      log.debug("Network idle");

      const challengeCookie = await this.extractChallengeCookie(page);
      log.debug("Extracted challenge cookie");

      const html = await page.content();
      const data: RawListingsData = parseHydrationData(html);
      const listings = data.props?.pageProps?.listings || [];
      log.info(`Found ${listings.length} listings on page ${pageNumber}`);

      return { listings, challengeCookie };
    } catch (error) {
      log.error(`Error scraping page ${pageNumber}`, { error: String(error) });
      throw error;
    } finally {
      log.debug("Closing browser");
      await browser.close();
    }
  }

  async scrapeAllProperties(): Promise<RawPropertyData[]> {
    const allProperties: RawPropertyData[] = [];
    let currentPage = SCRAPING.DEFAULT_START_PAGE;
    const maxProperties = this.config.maxProperties;

    log.info(`Starting scrape from: ${this.baseUrl}`);

    while (true) {
      if (maxProperties && allProperties.length >= maxProperties) {
        log.info(`Reached max properties limit: ${maxProperties}`);
        break;
      }

      log.info(`Scraping page ${currentPage}`);

      try {
        const { listings, challengeCookie } =
          await this.scrapeListingsPage(currentPage);

        if (listings.length === 0) {
          log.info("No more listings found");
          break;
        }

        for (const listing of listings) {
          if (maxProperties && allProperties.length >= maxProperties) break;

          const seoFriendlyPath = listing.listing?.seoFriendlyPath;
          if (!seoFriendlyPath) {
            log.debug("Skipping listing without seoFriendlyPath");
            continue;
          }

          const propertyUrl = `${DAFT.DOMAIN}${seoFriendlyPath}`;

          try {
            await new Promise((resolve) => setTimeout(resolve, this.delayMs));
            const propertyDetails = await this.scrapeDetailsWithCookie(
              propertyUrl,
              challengeCookie,
            );
            allProperties.push(propertyDetails);
            log.info(`Scraped ${allProperties.length} properties`);
          } catch (error) {
            log.debug(`Failed to scrape ${propertyUrl}: ${error}`);
            continue;
          }
        }
        currentPage++;
      } catch (error) {
        log.error(`Failed to scrape page ${currentPage}`, { error: String(error) });
        break;
      }
    }

    return allProperties;
  }
}
