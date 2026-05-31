import { Actor, log, LogLevel } from "apify";
import { writeFileSync } from "fs";
import { CrawlerService, DataCleanerService } from "./services";
import type { Property } from "./models";

interface Input {
  searchTerm: string;
  saleOrRent: "sale" | "rent";
  maxProperties?: number;
  location?: string;
}

await Actor.init();

if (!Actor.isAtHome()) {
  log.setLevel(LogLevel.DEBUG);
}

const input = (await Actor.getInput<Input>()) || {
  searchTerm: "",
  saleOrRent: "rent",
  maxProperties: 20,
};

log.info("Starting scraper", {
  searchTerm: input.searchTerm,
  saleOrRent: input.saleOrRent,
  location: input.location || "ireland",
  maxProperties: input.maxProperties && input.maxProperties > 0 ? input.maxProperties : "unlimited",
});

const crawler = new CrawlerService({
  searchTerm: input.searchTerm,
  saleOrRent: input.saleOrRent,
  maxProperties: input.maxProperties,
  location: input.location,
});

const rawProperties = await crawler.scrapeAllProperties();
log.info(`Processing ${rawProperties.length} properties`);

const cleanedProperties: Property[] = [];
for (const rawProperty of rawProperties) {
  const cleaned = DataCleanerService.cleanProperty(rawProperty);
  if (cleaned) {
    cleanedProperties.push(cleaned);
  }
}

log.debug(`Cleaned ${cleanedProperties.length}/${rawProperties.length}`);

const deduplicated = DataCleanerService.removeDuplicates(cleanedProperties);
const sorted = DataCleanerService.sortByPublishDate(deduplicated);

if (deduplicated.length < cleanedProperties.length) {
  log.debug(
    `Removed ${cleanedProperties.length - deduplicated.length} duplicates`,
  );
}

if (Actor.isAtHome()) {
  await Actor.pushData(sorted);
  log.info(`Saved ${sorted.length} properties to dataset`);
} else {
  writeFileSync("properties.json", JSON.stringify(sorted, null, 2));
  log.info(`Saved ${sorted.length} properties to properties.json`);
}

await Actor.exit();
