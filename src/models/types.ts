export interface Distance {
  value: number;
  unit: "km";
}

export interface Location {
  lat: string;
  lon: string;
}

export interface School {
  schoolName: string;
  numPupils: number;
  distance: Distance;
  location: Location;
}

export interface PublicTransport {
  type: "Bus" | "Rail" | "Tram";
  stop: string;
  route: string;
  destination: string;
  provider: string;
  distance: Distance;
  location: Location;
}

export interface Amenities {
  primarySchools: School[];
  secondarySchools: School[];
  publicTransports: PublicTransport[];
}

export interface Price {
  amount: number;
  currency: "EUR";
  formatted: string;
}

export interface FloorArea {
  unit: "METRES_SQUARED" | "ACRES";
  value: string;
}

export interface Image {
  size1440x960: string;
  size1200x1200: string;
  size360x240: string;
  size72x52: string;
  imageLabels?: ImageLabel[];
  caption?: string;
}

export interface ImageLabel {
  label: string;
  type: string;
}

export interface PriceHistory {
  date: string;
  price: string;
  direction: "INCREASE" | "DECREASE";
  priceDifference: string;
}

export interface PropertyLocation {
  areaName: string | null;
  primaryAreaId: number | null;
  isInRepublicOfIreland: boolean;
  coordinates: number[];
  eircodes: string[];
}

export interface Dates {
  publishDate: string;
  lastUpdateDate: string;
  dateOfConstruction: string | null;
}

export interface Media {
  images: Image[];
  totalImages: number;
  hasVideo: boolean;
  hasVirtualTour: boolean;
  hasBrochure: boolean;
}

export interface SellerImages {
  profileImage: string | null;
  profileRoundedImage: string | null;
  standardLogo: string | null;
  squareLogo: string | null;
}

export interface Seller {
  id: number;
  name: string;
  type: "BRANDED_AGENT" | "PRIVATE_USER" | "UNBRANDED_AGENT";
  branch: string | null;
  address: string | null;
  phone: string | null;
  alternativePhone: string | null;
  licenceNumber: string | null;
  available: boolean;
  premierPartner: boolean;
  images: SellerImages;
  backgroundColour: string | null;
}

export interface BER {
  rating: string | null;
}

export interface NearbyLocations {
  closeBy?: string[];
  shortDrive?: string[];
  withinHour?: string[];
}

export interface Extracted {
  folios: string[];
  utilities: string[];
  nearbyLocations: NearbyLocations;
}

export interface Metadata {
  featuredLevel: string;
  featuredLevelFull: string;
  sticker: string | null;
  sellingType: string;
  category: string;
  state: string;
  platform: string;
  premierPartner: boolean;
  imageRestricted: boolean;
}

export interface Stamps {
  stampDutyValue: Price | null;
}

export interface Branding {
  standardLogo?: string;
  squareLogo?: string;
  backgroundColour?: string;
  squareLogos?: string[];
  rectangleLogo?: string;
}

export interface Analytics {
  listingViews: number;
}

export interface Property {
  id: number;
  title: string;
  seoTitle: string;
  amenities: Amenities;
  floorArea?: FloorArea;
  floorAreaFormatted?: string;
  floorPlanImages: Image[];
  daftShortcode: string;
  seoFriendlyPath: string;
  priceHistory: PriceHistory[];
  propertyType: string;
  sections: string[];
  price?: Price;
  bedrooms?: number;
  bathrooms?: number;
  location: PropertyLocation;
  dates: Dates;
  media: Media;
  seller: Seller;
  ber: BER;
  description: string;
  features: string[];
  extracted: Extracted;
  metadata: Metadata;
  stamps: Stamps;
  branding: Branding;
  analytics: Analytics;
}

export interface RawListing {
  listing?: {
    seoFriendlyPath?: string;
  };
}

export interface RawListingsData {
  props?: {
    pageProps?: {
      listings?: RawListing[];
    };
  };
}

export interface RawPropertyData {
  props?: {
    pageProps?: {
      listing?: any;
      amenities?: Amenities;
      listingViews?: number;
    };
  };
}

export interface ScraperConfig {
  domain: string;
  startUrl: string;
  startPage: number;
  endPage: number;
  delayBetweenRequests: number;
  outputFile: string;
}
