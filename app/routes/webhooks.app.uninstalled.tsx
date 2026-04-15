import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If the app is already uninstalled, the session may be undefined.
  //
  // We intentionally do NOT delete locations here. Merchants often uninstall/reinstall
  // during theme changes or to troubleshoot — deleting their locations on every
  // uninstall creates a terrible experience. Location data is cleaned up by the
  // shop/redact webhook (fires 48 hours after uninstall if the shop doesn't reinstall).
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
