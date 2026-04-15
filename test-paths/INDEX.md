# Test paths

Everything you need to click through before declaring the app ready for Shane.

## 0. Local bring up

```
docker compose up -d
npm install
npm run setup
shopify app dev -c shopify.app.toml
```

Open the preview URL from the CLI output, install on `win-win-ccae-dev`.

## 1. First run in admin

- [ ] Home page renders, shows a "needs setup" banner because no Google Maps API key is set
- [ ] Banner link opens the Settings page at the API key section

## 2. Settings

- [ ] Paste a Google Maps JS API key (create one at console.cloud.google.com, enable Maps JavaScript API + Geocoding API)
- [ ] Save, banner on Home page clears
- [ ] Try each map style (standard, silver, dark, retro), save, confirm the Settings page reloads with the choice kept
- [ ] Toggle directions, phone, hours, search, radius filter, tag filter off then on, confirm saved

## 3. Add location

- [ ] Click Add Location, fill store info (name, street, city, state, postal, country)
- [ ] Add 2 service tags like "Repairs" and "Pickup"
- [ ] Fill hours for Mon through Fri, mark Sat + Sun closed
- [ ] Save, confirm redirect to list page
- [ ] Row shows a green "Geocoded" badge with lat/lng (not red "Needs geocoding")

Repeat for 2 more locations in different cities so distance sorting has something to do.

## 4. Location management

- [ ] Edit a location, change only the store name, save, confirm lat/lng did NOT re geocode (address unchanged)
- [ ] Edit a location, change the street address, save, confirm new lat/lng was fetched
- [ ] Toggle Enable/Disable, confirm the badge flips
- [ ] Delete a location via the confirm modal, confirm it's gone from the list

## 5. Storefront (the real test)

- [ ] Theme editor, add the Store Locator Map block to a page (or the home page)
- [ ] Confirm the app embed "Store Locator Map" shows as active under App embeds
- [ ] Visit the storefront page, confirm the map loads with all enabled locations pinned
- [ ] Type a zip code near one of the locations into the search box, hit enter
- [ ] Results list re sorts by distance, map re centers, nearest pin is highlighted
- [ ] Change the radius filter to something small (5 km), confirm far results drop out
- [ ] Click a tag filter, confirm only matching locations stay visible
- [ ] Click a pin, info window opens with name, address, phone, hours, "open now" badge if applicable, Get Directions link
- [ ] Click Get Directions, confirm it opens Google Maps with correct coords
- [ ] Test on mobile width (DevTools), sidebar stacks above the map, everything scrolls

## 6. GDPR webhooks

- [ ] Uninstall the app from the test store, confirm locations are NOT deleted (only sessions)
- [ ] Trigger shop/redact webhook manually, confirm all Location + LocatorSettings + Session rows for the shop are gone

## 7. Deploy ready check

- [ ] `shopify app deploy -c shopify.app.toml --allow-updates` runs clean
- [ ] `npm run build` has zero TypeScript errors
- [ ] `prisma migrate deploy` works on a fresh Postgres db

If every box is checked, ship it to Shane.
