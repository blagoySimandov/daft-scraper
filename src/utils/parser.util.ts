import { PATTERNS } from "../config";

export const parseHydrationData = (html: string): any => {
  const match = html.match(PATTERNS.NEXT_DATA);
  if (!match || !match[1]) {
    throw new Error("Could not find __NEXT_DATA__ script tag");
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`);
  }
};

export const parseDate = (dateStr?: string | null): string | undefined => {
  if (!dateStr) return undefined;
  try {
    const date = new Date(String(dateStr));
    if (isNaN(date.getTime())) {
      return String(dateStr);
    }
    return date.toISOString();
  } catch {
    return String(dateStr);
  }
};
