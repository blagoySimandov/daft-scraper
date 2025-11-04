import {
  extractPrice,
  extractNumber,
  extractEircodes,
  extractFolios,
  extractUtilities,
  extractNearbyLocations,
  parseDate,
} from "../utils";
import type { Property, RawPropertyData, Image } from "../models";

export class DataCleanerService {
  static cleanProperty(item: RawPropertyData): Property | null {
    try {
      const listing = item?.props?.pageProps?.listing;
      const pageProps = item?.props?.pageProps;
      if (!listing) return null;

      const description = listing.description || "";
      const images = listing.media?.images || [];
      const floorPlanImages: Image[] = images.filter((image: any) => {
        const imageLabels = image.imageLabels || [];
        return imageLabels.some((label: any) => label.type === "FLOOR_PLAN");
      });

      return {
        id: listing.id,
        title: listing.title,
        seoTitle: listing.seoTitle,
        amenities: pageProps?.amenities || {
          primarySchools: [],
          secondarySchools: [],
          publicTransports: [],
        },
        floorArea: listing.floorArea,
        floorAreaFormatted: listing.propertySize,
        floorPlanImages,
        daftShortcode: listing.daftShortcode,
        seoFriendlyPath: listing.seoFriendlyPath,
        priceHistory: listing.priceHistory || [],
        propertyType: listing.propertyType,
        sections: listing.sections || [],
        price: extractPrice(listing.price) || undefined,
        bedrooms: extractNumber(listing.numBedrooms) || listing.nonFormatted?.beds,
        bathrooms: extractNumber(listing.numBathrooms),
        location: {
          areaName: listing.areaName,
          primaryAreaId: listing.primaryAreaId,
          isInRepublicOfIreland: listing.isInRepublicOfIreland || false,
          coordinates: listing.point?.coordinates || [],
          eircodes: extractEircodes(description),
        },
        dates: {
          publishDate: parseDate(listing.publishDate) || new Date().toISOString(),
          lastUpdateDate: parseDate(listing.lastUpdateDate) || new Date().toISOString(),
          dateOfConstruction: listing.dateOfConstruction || null,
        },
        media: {
          images: listing.media?.images || [],
          totalImages: listing.media?.totalImages || 0,
          hasVideo: listing.media?.hasVideo || false,
          hasVirtualTour: listing.media?.hasVirtualTour || false,
          hasBrochure: listing.media?.hasBrochure || false,
        },
        seller: {
          id: listing.seller?.sellerId,
          name: listing.seller?.name,
          type: listing.seller?.sellerType,
          branch: listing.seller?.branch || null,
          address: listing.seller?.address || null,
          phone: listing.seller?.phone || null,
          alternativePhone: listing.seller?.alternativePhone || null,
          licenceNumber: listing.seller?.licenceNumber || null,
          available: listing.seller?.sellerAvailable || false,
          premierPartner: listing.seller?.premierPartnerSeller || false,
          images: {
            profileImage: listing.seller?.profileImage || null,
            profileRoundedImage: listing.seller?.profileRoundedImage || null,
            standardLogo: listing.seller?.standardLogo || null,
            squareLogo: listing.seller?.squareLogo || null,
          },
          backgroundColour: listing.seller?.backgroundColour || null,
        },
        ber: {
          rating: listing.ber?.rating || null,
        },
        description,
        features: listing.features || [],
        extracted: {
          folios: extractFolios(description),
          utilities: extractUtilities(description),
          nearbyLocations: extractNearbyLocations(description),
        },
        metadata: {
          featuredLevel: listing.featuredLevel,
          featuredLevelFull: listing.featuredLevelFull,
          sticker: listing.sticker || null,
          sellingType: listing.sellingType,
          category: listing.category,
          state: listing.state,
          platform: listing.platform,
          premierPartner: listing.premierPartner || false,
          imageRestricted: listing.imageRestricted || false,
        },
        stamps: {
          stampDutyValue: extractPrice(listing.stampDutyValue),
        },
        branding: listing.pageBranding || {},
        analytics: {
          listingViews: pageProps?.listingViews || 0,
        },
      };
    } catch {
      return null;
    }
  }

  static removeDuplicates(properties: Property[]): Property[] {
    const uniqueIds = new Set<number>();
    return properties.filter((prop) => {
      if (uniqueIds.has(prop.id)) return false;
      uniqueIds.add(prop.id);
      return true;
    });
  }

  static sortByPublishDate(properties: Property[]): Property[] {
    return properties.sort((a, b) => {
      const dateA = new Date(a.dates.publishDate).getTime();
      const dateB = new Date(b.dates.publishDate).getTime();
      return dateB - dateA;
    });
  }
}
