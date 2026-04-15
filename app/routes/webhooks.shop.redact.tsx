import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../shopify.server";

/**
 * GDPR: shop/redact
 *
 * Shopify sends this 48 hours after a shop uninstalls the app. We clean
 * up all locations, settings, and sessions belonging to the shop. HMAC is
 * verified by authenticate.webhook().
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop} — redacting all shop data`);

  await prisma.location.deleteMany({ where: { shop } });
  await prisma.locatorSettings.deleteMany({ where: { shop } });
  await prisma.session.deleteMany({ where: { shop } });

  return new Response();
};
