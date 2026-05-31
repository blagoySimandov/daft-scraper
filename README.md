<<<<<<< HEAD
# Daft.ie Property Scraper

Scrapes property listings from Daft.ie based on search criteria.

## Input Schema

```json
{
  "searchTerm": "string",
  "saleOrRent": "sale | rent",
  "location": "string (optional)",
  "maxProperties": "integer (optional, default: 20)"
}
```

**Required**: `searchTerm`, `saleOrRent`

### Parameters

- **searchTerm**: Property search term (e.g., 'derelict', 'apartment', 'cottage')
- **saleOrRent**: Search for properties for sale or rent (`"sale"` or `"rent"`)
- **location**: Optional location filter (e.g., 'dublin', 'cork', 'galway'). Leave empty for all of Ireland
- **maxProperties**: Maximum number of properties to scrape. Default is 20. Set to -1 for unlimited scraping

## Output Schema

Each property returns:

- **id**: Property ID
- **title**: Listing title
- **price**: Amount, currency, formatted
- **bedrooms**: Number of bedrooms
- **bathrooms**: Number of bathrooms
- **floorArea**: Size with unit
- **description**: Full property description
- **features**: Array of property features
- **location**: Area name, coordinates, eircodes
- **dates**: Publish date, last update, construction date
- **media**: Images, video, virtual tour, brochure
- **seller**: Agent information and contact details
- **ber**: Building Energy Rating
- **amenities**: Nearby schools and transport
- **priceHistory**: Historical price changes
- **extracted**: Folios, utilities, nearby locations
- **metadata**: Category, state, selling type
- **analytics**: Listing views
=======
# Daft Scraper with Apify
>>>>>>> main
