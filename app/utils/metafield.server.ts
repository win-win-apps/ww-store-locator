import { prisma } from "../shopify.server";

const SHOPIFY_API_VERSION = "2025-01";

/**
 * Direct Shopify Admin GraphQL call using the offline access token stored in
 * Prisma. Matches the pattern from ww-badges: the embedded auth strategy's
 * per-request online session token can silently fail for currentAppInstallation
 * on fly.io, so we bypass it entirely for metafield writes.
 */
async function shopifyAdminGraphql(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify GraphQL HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Syncs the active locations + global settings for a shop to two
 * AppInstallation metafields:
 *
 *   namespace: "ww_store_locator" (app-data metafield on AppInstallation)
 *     key: "config"    — global settings, includes googleMapsApiKey
 *     key: "locations" — JSON array of active locations
 *
 * The theme app extension reads both via Liquid app object:
 *   app.metafields.ww_store_locator.config
 *   app.metafields.ww_store_locator.locations
 *
 * No $app prefix needed since AppInstallation provides namespace isolation.
 *
 * IMPORTANT: fails silently. Config sync must never block a save redirect.
 */
export async function syncLocatorToMetafield(shop: string) {
  try {
    const [locations, settings] = await Promise.all([
      prisma.location.findMany({
        where: { shop, isActive: true },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      }),
      prisma.locatorSettings.findUnique({ where: { shop } }),
    ]);

    const locationConfig = locations.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description || "",
      address: [
        l.addressLine1,
        l.addressLine2,
        l.city,
        l.region,
        l.postalCode,
        l.country,
      ]
        .filter(Boolean)
        .join(", "),
      lat: l.lat,
      lng: l.lng,
      phone: l.phone || "",
      email: l.email || "",
      website: l.website || "",
      hours: safeJsonParse(l.hours, {}),
      tags: safeJsonParse(l.tags, []),
    }));

    const settingsConfig = settings
      ? {
          pageTitle: settings.pageTitle,
          introText: settings.introText || "",
          mapStyle: settings.mapStyle,
          defaultZoom: settings.defaultZoom,
          defaultLat: settings.defaultLat,
          defaultLng: settings.defaultLng,
          radiusUnit: settings.radiusUnit,
          defaultRadius: settings.defaultRadius,
          showDirections: settings.showDirections,
          showPhone: settings.showPhone,
          showHours: settings.showHours,
          showSearchBar: settings.showSearchBar,
          showRadiusFilter: settings.showRadiusFilter,
          showTagFilter: settings.showTagFilter,
          primaryColor: settings.primaryColor,
          pinColor: settings.pinColor,
          googleMapsApiKey: settings.googleMapsApiKey || "",
          plan: settings.plan,
        }
      : null;

    const session = await prisma.session.findUnique({ where: { shop } });
    if (!session?.accessToken) {
      console.error(
        "WW Store Locator: No session for shop — skipping metafield sync:",
        shop
      );
      return;
    }

    const installData = await shopifyAdminGraphql(
      shop,
      session.accessToken,
      `{ currentAppInstallation { id } }`
    );
    const appInstallId = installData.data?.currentAppInstallation?.id;
    if (!appInstallId) {
      console.error(
        "WW Store Locator: currentAppInstallation returned null:",
        shop,
        JSON.stringify(installData)
      );
      return;
    }

    const result = await shopifyAdminGraphql(
      shop,
      session.accessToken,
      `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id key namespace }
          userErrors { field message code }
        }
      }`,
      {
        metafields: [
          {
            namespace: "ww_store_locator",
            key: "config",
            value: JSON.stringify(settingsConfig || {}),
            type: "json",
            ownerId: appInstallId,
          },
          {
            namespace: "ww_store_locator",
            key: "locations",
            value: JSON.stringify(locationConfig),
            type: "json",
            ownerId: appInstallId,
          },
        ],
      }
    );

    const errors = result.data?.metafieldsSet?.userErrors;
    if (errors && errors.length > 0) {
      console.error(
        "WW Store Locator: metafieldsSet userErrors:",
        shop,
        JSON.stringify(errors)
      );
    } else {
      console.log(
        `WW Store Locator: synced ${locations.length} location(s) + settings for ${shop}`
      );
    }
  } catch (err) {
    console.error("WW Store Locator: sync failed (non-fatal):", err);
  }
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
