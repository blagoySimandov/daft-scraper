import { PATTERNS, UTILITIES, LOCATION_PATTERNS } from "../config";
import type { Price, NearbyLocations } from "../models";

export const extractPrice = (priceStr?: string | null): Price | null => {
  if (!priceStr) return null;
  const match = String(priceStr).match(PATTERNS.PRICE);
  if (match && match[1]) {
    const amount = parseFloat(match[1].replace(/,/g, ""));
    return {
      amount,
      currency: "EUR",
      formatted: priceStr,
    };
  }
  return null;
};

export const extractNumber = (text?: string | null): number | undefined => {
  if (!text) return undefined;
  const match = String(text).match(PATTERNS.NUMBER);
  return match ? parseInt(match[0], 10) : undefined;
};

export const extractEircodes = (text?: string | null): string[] => {
  if (!text) return [];
  const matches = text.match(PATTERNS.EIRCODE);
  return matches ? matches.map((m) => m.replace(/\s/g, "")) : [];
};

export const extractFolios = (text?: string | null): string[] => {
  if (!text) return [];
  const matches = text.matchAll(PATTERNS.FOLIO);
  return Array.from(matches, (m) => m[1]).filter((x): x is string => !!x);
};

export const extractUtilities = (text?: string | null): string[] => {
  if (!text) return [];
  const utilities: string[] = [];
  const textLower = text.toLowerCase();
  for (const [utilityName, pattern] of UTILITIES) {
    if (pattern.test(textLower)) {
      utilities.push(utilityName);
    }
  }
  return utilities;
};

export const extractNearbyLocations = (
  text?: string | null,
): NearbyLocations => {
  if (!text) return {};
  const locations: NearbyLocations = {};

  const shortDriveMatches = text.matchAll(LOCATION_PATTERNS.SHORT_DRIVE);
  const shortDriveList: string[] = [];
  for (const match of shortDriveMatches) {
    if (match[1]) {
      const locationList = match[1].split(" or ").map((loc) => loc.trim());
      shortDriveList.push(...locationList);
    }
  }
  if (shortDriveList.length > 0) {
    locations.shortDrive = shortDriveList;
  }

  const withinHourMatches = text.matchAll(LOCATION_PATTERNS.WITHIN_HOUR);
  const withinHourList: string[] = [];
  for (const match of withinHourMatches) {
    if (match[1]) {
      const locationList = match[1].split(" or ").map((loc) => loc.trim());
      withinHourList.push(...locationList);
    }
  }
  if (withinHourList.length > 0) {
    locations.withinHour = withinHourList;
  }

  const closeMatches = text.matchAll(LOCATION_PATTERNS.CLOSE_BY);
  const closeList: string[] = [];
  for (const match of closeMatches) {
    if (match[1]) {
      closeList.push(match[1].trim());
    }
  }
  if (closeList.length > 0) {
    locations.closeBy = closeList;
  }

  return locations;
};
