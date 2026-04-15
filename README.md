# ww-store-locator

Store Locator: Google Maps. App 07 in the Win-Win portfolio.

## What it does

Merchants add their physical store locations in the admin, customers search by zip or city on the storefront, and a Google Map with numbered pins + a results list shows the nearest stores with directions, hours, and phone.

## Stack

- Shopify Remix app scaffold (Polaris + App Bridge)
- Prisma + Postgres schema `winwin_store_locator`
- Theme App Extension (app embed auto injects config, app block is the merchant placed mount)
- Google Maps JS API + Geocoding API, merchant provides their own API key (no billing exposure for Win-Win)

## Local dev

See `test-paths/INDEX.md` for the full test walkthrough. Quick version:

```
docker compose up -d        # local postgres
npm install
npm run setup               # prisma migrate dev
shopify app dev -c shopify.app.toml
```

## Prod (Shane)

1. Register the prod app in the win-win Partner org, put the `client_id` in `shopify.app.prod.toml`.
2. `fly launch --copy-config --name ww-store-locator` then `fly secrets set SHOPIFY_API_KEY=... SHOPIFY_API_SECRET=... DATABASE_URL=postgresql://...`.
3. `shopify app deploy -c shopify.app.prod.toml --allow-updates` then `shopify app release --version=... --force`.
4. Send the `https://ww-store-locator.fly.dev` URL back so submission can finish.

## Pricing

- Free: up to 5 locations
- Pro $4.99/mo: unlimited locations, all map styles, radius + tag filters
- Premium $14.99/mo: everything in Pro + priority support

Undercuts Storemapper ($19.99 flat) and matches Stockist free tier while beating them on price at the paid level.
