import { log, ProxyConfiguration } from "apify";
import {
  PuppeteerCrawler,
  type PuppeteerCrawlingContext,
  type PuppeteerCrawler as PuppeteerCrawlerType,
} from "crawlee";
import { ANTI_BOT, DAFT, SCRAPING, TIMEOUTS } from "../config";
import { parseHydrationData } from "../utils";
import type { RawListing, RawListingsData, RawPropertyData } from "../models";

const LABELS = { LIST: "LIST", DETAIL: "DETAIL" } as const;

export interface CrawlerConfig {
  searchTerm: string;
  saleOrRent: string;
  maxProperties?: number;
  location?: string;
  proxyConfiguration?: ProxyConfiguration;
}

export class CrawlerService {
  private config: CrawlerConfig;
  private baseUrl: string;
  private results: RawPropertyData[] = [];

  constructor(config: CrawlerConfig) {
    this.config = config;
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

  private limitReached(): boolean {
    const max = this.config.maxProperties;
    return !!max && max > 0 && this.results.length >= max;
  }

  private listingUrl(page: number): string {
    return `${this.baseUrl}&page=${page}`;
  }

  private async waitForData(ctx: PuppeteerCrawlingContext): Promise<void> {
    await ctx.page.waitForSelector(DAFT.HYDRATION_SELECTOR, {
      timeout: TIMEOUTS.PAGE_LOAD,
    });
  }

  private async enqueueDetails(
    crawler: PuppeteerCrawlerType,
    listings: RawListing[],
  ): Promise<void> {
    for (const listing of listings) {
      if (this.limitReached()) return;
      const path = listing.listing?.seoFriendlyPath;
      if (!path) continue;
      await crawler.addRequests([
        { url: `${DAFT.DOMAIN}${path}`, label: LABELS.DETAIL },
      ]);
    }
  }

  private async enqueueNextPage(
    crawler: PuppeteerCrawlerType,
    current: number,
  ): Promise<void> {
    if (this.limitReached()) return;
    const next = current + 1;
    await crawler.addRequests([
      {
        url: this.listingUrl(next),
        label: LABELS.LIST,
        userData: { page: next },
      },
    ]);
  }

  private async handleList(ctx: PuppeteerCrawlingContext): Promise<void> {
    await this.waitForData(ctx);
    const data: RawListingsData = parseHydrationData(await ctx.page.content());
    const listings = data.props?.pageProps?.listings || [];
    const page = (ctx.request.userData.page as number) ?? 1;
    log.info(`Found ${listings.length} listings on page ${page}`);
    if (listings.length === 0) return;
    await this.enqueueDetails(ctx.crawler, listings);
    await this.enqueueNextPage(ctx.crawler, page);
  }

  private async handleDetail(ctx: PuppeteerCrawlingContext): Promise<void> {
    if (this.limitReached()) return;
    await this.waitForData(ctx);
    this.results.push(parseHydrationData(await ctx.page.content()));
    log.info(`Scraped ${this.results.length} properties`);
  }

  private buildCrawler(): PuppeteerCrawler {
    return new PuppeteerCrawler({
      proxyConfiguration: this.config.proxyConfiguration,
      maxConcurrency: ANTI_BOT.CONCURRENCY_LIMIT,
      navigationTimeoutSecs: TIMEOUTS.PAGE_LOAD / 1000,
      requestHandlerTimeoutSecs: TIMEOUTS.PAGE_LOAD / 1000,
      launchContext: {
        launchOptions: {
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
      requestHandler: async (ctx) =>
        ctx.request.label === LABELS.DETAIL
          ? this.handleDetail(ctx)
          : this.handleList(ctx),
    });
  }

  async scrapeAllProperties(): Promise<RawPropertyData[]> {
    this.results = [];
    log.info(`Starting scrape from: ${this.baseUrl}`);
    const crawler = this.buildCrawler();
    await crawler.run([
      {
        url: this.listingUrl(SCRAPING.DEFAULT_START_PAGE),
        label: LABELS.LIST,
        userData: { page: SCRAPING.DEFAULT_START_PAGE },
      },
    ]);
    const max = this.config.maxProperties;
    return max && max > 0 ? this.results.slice(0, max) : this.results;
  }
}
