# Architecture

## Data model (Prisma, schema `winwin_store_locator`)

- `Session` standard Shopify session store
- `Location` one row per physical store. Fields: name, address lines, city, region, postal, country, lat, lng, phone, email, website, hours (JSON, 7 days with open/close/closed), tags (JSON string array for service filters), priority, enabled, shop
- `LocatorSettings` one row per shop. Page title + intro copy, default map style (standard/silver/dark/retro), default zoom, default center, default radius, radius unit (km/mi), feature toggles (directions/phone/hours/search/radius filter/tag filter), primaryColor, pinColor, googleMapsApiKey, plan tier

## Storefront rendering

Liquid app embed runs in the theme's `<body>`:

1. Reads `app.metafields['app--{APP_ID}']['config']` and `['locations']` (always bracket notation, dot notation fails silently, see App 01 notes).
2. Emits a `<script>` tag that sets `window.WWStoreLocator = { config, locations, shop, currency }`.
3. Loads `store-locator.css` + `store-locator.js` via the extension asset URL.

The app block `locator.liquid` is just a mount div. Merchants drop it on a page in the theme editor; the engine finds all `.ww-store-locator` divs and renders a widget into each.

`store-locator.js` does:

- Lazy loads Google Maps JS API with the merchant's key
- Renders a sidebar with search box + radius selector + tag filter + results list
- Geocodes the customer's query, sorts locations by Haversine distance, drops numbered SVG pins on the map
- Info windows per pin with directions link, phone tap to call, hours with an "open now" badge

Zero storefront API calls. Everything it needs is in the injected `window.WWStoreLocator`.

## Admin <-> storefront sync

Admin writes to Postgres. After every write we call `syncLocatorToMetafield(shop)` which:

1. Fetches offline access token from the Session table
2. Builds the `config` + `locations` blobs
3. POSTs to the Admin GraphQL API with `metafieldsSet` mutation against the `$app` owner
4. Fails silently on error (per make-app skill Fix #2, embedded auth context can lose tokens so we use raw fetch not `authenticate.admin`)

## Why BYO Google Maps API key

Maps + Geocoding billing on a busy store can blow past $200/mo. If Win-Win eats that cost, one runaway merchant wipes out a month of revenue across the whole portfolio. Merchant provides their own key, we show a banner in Settings with a 4 step walkthrough to create one. Stockist and Storemapper both do it this way, so merchants are used to it.

## Scopes

`read_themes,write_themes` only. No product, order, or customer data. Minimum footprint for App Store review.
