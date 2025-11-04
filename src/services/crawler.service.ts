import axios from "axios";
import { log } from "apify";
import {
  ANTI_BOT,
  HTTP_HEADERS,
  DAFT,
  SCRAPING,
  CAPSOLVER,
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

  private async createCapSolverTask(websiteURL: string): Promise<string> {
    log.debug(`Creating CapSolver AntiCloudflareTask for ${websiteURL}`);
    const response = await axios.post(CAPSOLVER.CREATE_TASK_URL, {
      clientKey: CAPSOLVER.API_KEY,
      task: {
        type: CAPSOLVER.TASK_TYPE,
        websiteURL,
        proxy: CAPSOLVER.PROXY,
      },
    });

    if (response.data.errorId !== 0) {
      throw new Error(`CapSolver error: ${response.data.errorDescription}`);
    }

    log.debug(`CapSolver task created: ${response.data.taskId}`);
    return response.data.taskId;
  }

  private async getCapSolverResult(taskId: string): Promise<string> {
    log.debug(`Polling CapSolver for cf_clearance cookie: ${taskId}`);
    const startTime = Date.now();

    while (Date.now() - startTime < CAPSOLVER.MAX_POLL_TIME_MS) {
      const response = await axios.post(CAPSOLVER.GET_RESULT_URL, {
        clientKey: CAPSOLVER.API_KEY,
        taskId,
      });

      if (response.data.errorId !== 0) {
        throw new Error(`CapSolver error: ${response.data.errorDescription}`);
      }

      if (response.data.status === "ready") {
        const cfClearance = response.data.solution.token;
        const elapsed = Date.now() - startTime;
        log.info(`CapSolver solved Cloudflare challenge in ${elapsed}ms`);
        log.debug(`cf_clearance cookie: ${cfClearance}`);
        return cfClearance;
      }

      log.debug(`CapSolver status: ${response.data.status}, waiting...`);
      await new Promise((resolve) => setTimeout(resolve, CAPSOLVER.POLL_INTERVAL_MS));
    }

    throw new Error("CapSolver timeout: solution not received in time");
  }

  private async solveCloudflareWithCapSolver(websiteURL: string): Promise<string> {
    log.info("Solving Cloudflare challenge with CapSolver");

    const taskId = await this.createCapSolverTask(websiteURL);
    const cfClearance = await this.getCapSolverResult(taskId);

    return cfClearance;
  }

  private async handleCloudflareChallenge(url: string): Promise<string | null> {
    log.debug("Detecting Cloudflare challenge");
    try {
      const response = await axios.get(url, {
        headers: HTTP_HEADERS,
        validateStatus: () => true,
      });

      const isChallenge = response.status === 403 ||
                         response.data.includes('Just a moment') ||
                         response.data.includes('cf-turnstile-response') ||
                         response.data.includes('challenge-platform');

      if (isChallenge) {
        log.info("Cloudflare challenge detected, solving with CapSolver");
        const cfClearance = await this.solveCloudflareWithCapSolver(url);
        return `${ANTI_BOT.CLOUDFLARE_COOKIE}=${cfClearance}`;
      } else {
        log.debug("No Cloudflare challenge detected");
        return null;
      }
    } catch (error) {
      log.error(`Cloudflare challenge detection error: ${error}`);
      return null;
    }
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
    log.info(`Scraping page ${pageNumber} with CapSolver`);

    const challengeCookie = await this.handleCloudflareChallenge(url);

    if (!challengeCookie) {
      throw new Error("Failed to get cf_clearance cookie from CapSolver");
    }

    log.info("Got cf_clearance cookie, fetching listings");

    const response = await axios.get(url, {
      headers: {
        ...HTTP_HEADERS,
        cookie: challengeCookie,
      },
    });

    const data: RawListingsData = parseHydrationData(response.data);
    const listings = data.props?.pageProps?.listings || [];
    log.info(`Found ${listings.length} listings on page ${pageNumber}`);

    return { listings, challengeCookie };
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
