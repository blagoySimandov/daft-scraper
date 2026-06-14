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

const hostOs = (): "macos" | "windows" | "linux" =>
  process.platform === "darwin"
    ? "macos"
    : process.platform === "win32"
      ? "windows"
      : "linux";

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
  private enqueuedDetails = 0;

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

  private detailBudget(): number {
    const max = this.config.maxProperties;
    if (!max || max <= 0) return Infinity;
    return Math.max(0, max - this.enqueuedDetails);
  }

  private listingUrl(page: number): string {
    return `${this.baseUrl}&page=${page}`;
  }

  private async waitForData(ctx: PuppeteerCrawlingContext): Promise<void> {
    try {
      await ctx.page.waitForSelector(DAFT.HYDRATION_SELECTOR, {
        timeout: TIMEOUTS.CHALLENGE_WAIT,
      });
    } catch {
      ctx.session?.retire();
      throw new Error("Cloudflare challenge not solved, rotating IP");
    }
  }

  private async enqueueDetails(
    crawler: PuppeteerCrawlerType,
    listings: RawListing[],
  ): Promise<void> {
    const paths = listings
      .map((l) => l.listing?.seoFriendlyPath)
      .filter((p): p is string => !!p)
      .slice(0, this.detailBudget());
    this.enqueuedDetails += paths.length;
    await crawler.addRequests(
      paths.map((p) => ({ url: `${DAFT.DOMAIN}${p}`, label: LABELS.DETAIL })),
    );
  }

  private async enqueueNextPage(
    crawler: PuppeteerCrawlerType,
    current: number,
  ): Promise<void> {
    if (this.detailBudget() <= 0) return;
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
    if (this.limitReached()) await ctx.crawler.stop();
  }

  private async blockHeavyResources(
    ctx: PuppeteerCrawlingContext,
  ): Promise<void> {
    await ctx.page.setRequestInterception(true);
    const blocked: readonly string[] = ANTI_BOT.BLOCKED_RESOURCES;
    ctx.page.on("request", (req) =>
      blocked.includes(req.resourceType()) ? req.abort() : req.continue(),
    );
  }

  private buildCrawler(): PuppeteerCrawler {
    return new PuppeteerCrawler({
      proxyConfiguration: this.config.proxyConfiguration,
      maxConcurrency: ANTI_BOT.CONCURRENCY_LIMIT,
      maxRequestRetries: ANTI_BOT.MAX_RETRIES,
      navigationTimeoutSecs: TIMEOUTS.PAGE_LOAD / 1000,
      requestHandlerTimeoutSecs: TIMEOUTS.PAGE_LOAD / 1000,
      persistCookiesPerSession: true,
      sessionPoolOptions: { blockedStatusCodes: [] },
      browserPoolOptions: {
        fingerprintOptions: {
          fingerprintGeneratorOptions: {
            browsers: ["chrome"],
            operatingSystems: [hostOs()],
            devices: ["desktop"],
          },
        },
      },
      launchContext: {
        launchOptions: {
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
      preNavigationHooks: [(ctx) => this.blockHeavyResources(ctx)],
      requestHandler: async (ctx) =>
        ctx.request.label === LABELS.DETAIL
          ? this.handleDetail(ctx)
          : this.handleList(ctx),
    });
  }

  private warmupRequests() {
    const start = SCRAPING.DEFAULT_START_PAGE;
    return Array.from({ length: SCRAPING.WARMUP_PAGES }, (_, i) => ({
      url: this.listingUrl(start + i),
      label: LABELS.LIST,
      userData: { page: start + i },
    }));
  }

  async scrapeAllProperties(): Promise<RawPropertyData[]> {
    this.results = [];
    this.enqueuedDetails = 0;
    log.info(`Starting scrape from: ${this.baseUrl}`);
    const crawler = this.buildCrawler();
    await crawler.run(this.warmupRequests());
    const max = this.config.maxProperties;
    return max && max > 0 ? this.results.slice(0, max) : this.results;
  }
}
