import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const SHOPIFY_API_VERSION = "2025-01";
const SHOP = "win-win-ccae-dev.myshopify.com";

async function shopifyAdminGraphql(shop, accessToken, query, variables) {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function safeJsonParse(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function main() {
  const [locations, settings, session] = await Promise.all([
    prisma.location.findMany({ where: { shop: SHOP, isActive: true }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }),
    prisma.locatorSettings.findUnique({ where: { shop: SHOP } }),
    prisma.session.findUnique({ where: { shop: SHOP } }),
  ]);

  console.log(`locations: ${locations.length}, settings: ${!!settings}, session: ${!!session?.accessToken}`);

  if (!session?.accessToken) { console.error("No session"); process.exit(1); }

  const locationConfig = locations.map(l => ({
    id: l.id, name: l.name, description: l.description || "",
    address: [l.addressLine1, l.addressLine2, l.city, l.region, l.postalCode, l.country].filter(Boolean).join(", "),
    lat: l.lat, lng: l.lng, phone: l.phone || "", email: l.email || "",
    website: l.website || "", hours: safeJsonParse(l.hours, {}), tags: safeJsonParse(l.tags, []),
  }));

  const settingsConfig = settings ? {
    pageTitle: settings.pageTitle, introText: settings.introText || "",
    mapStyle: settings.mapStyle, defaultZoom: settings.defaultZoom,
    defaultLat: settings.defaultLat, defaultLng: settings.defaultLng,
    radiusUnit: settings.radiusUnit, defaultRadius: settings.defaultRadius,
    showDirections: settings.showDirections, showPhone: settings.showPhone,
    showHours: settings.showHours, showSearchBar: settings.showSearchBar,
    showRadiusFilter: settings.showRadiusFilter, showTagFilter: settings.showTagFilter,
    primaryColor: settings.primaryColor, pinColor: settings.pinColor,
    googleMapsApiKey: settings.googleMapsApiKey || "", plan: settings.plan,
  } : null;

  console.log("config:", JSON.stringify(settingsConfig, null, 2).slice(0, 200));
  console.log("locations sample:", locationConfig[0]?.name, locationConfig[0]?.lat);

  const installData = await shopifyAdminGraphql(SHOP, session.accessToken, `{ currentAppInstallation { id } }`);
  const appInstallId = installData.data?.currentAppInstallation?.id;
  console.log("appInstallId:", appInstallId);

  const result = await shopifyAdminGraphql(SHOP, session.accessToken,
    `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id key namespace }
        userErrors { field message code }
      }
    }`,
    { metafields: [
      { namespace: "ww_store_locator", key: "config", value: JSON.stringify(settingsConfig || {}), type: "json", ownerId: appInstallId },
      { namespace: "ww_store_locator", key: "locations", value: JSON.stringify(locationConfig), type: "json", ownerId: appInstallId },
    ]}
  );

  console.log("result:", JSON.stringify(result.data?.metafieldsSet, null, 2));
  if (result.data?.metafieldsSet?.userErrors?.length) {
    console.error("ERRORS:", result.data.metafieldsSet.userErrors);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
