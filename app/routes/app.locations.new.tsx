import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Page } from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { syncLocatorToMetafield } from "../utils/metafield.server";
import { geocodeAddress } from "../utils/geocode.server";
import LocationForm from "../components/LocationForm";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const fields = {
    name: String(form.get("name") || "").trim(),
    description: String(form.get("description") || "") || null,
    addressLine1: String(form.get("addressLine1") || "").trim(),
    addressLine2: String(form.get("addressLine2") || "") || null,
    city: String(form.get("city") || "").trim(),
    region: String(form.get("region") || "") || null,
    postalCode: String(form.get("postalCode") || "") || null,
    country: String(form.get("country") || "United States"),
    phone: String(form.get("phone") || "") || null,
    email: String(form.get("email") || "") || null,
    website: String(form.get("website") || "") || null,
    hours: String(form.get("hours") || "{}"),
    tags: String(form.get("tags") || "[]"),
    isActive: String(form.get("isActive") || "1") === "1",
  };

  if (!fields.name || !fields.addressLine1 || !fields.city) {
    return json({ error: "Name, address, and city are required" }, { status: 400 });
  }

  const settings = await prisma.locatorSettings.findUnique({
    where: { shop: session.shop },
  });

  const fullAddress = [
    fields.addressLine1,
    fields.addressLine2,
    fields.city,
    fields.region,
    fields.postalCode,
    fields.country,
  ]
    .filter(Boolean)
    .join(", ");

  const geo = await geocodeAddress(fullAddress, settings?.googleMapsApiKey);

  await prisma.location.create({
    data: {
      shop: session.shop,
      ...fields,
      lat: geo.lat,
      lng: geo.lng,
      geocodeError: geo.error,
    },
  });

  await syncLocatorToMetafield(session.shop);
  return redirect("/app/locations");
};

export default function NewLocation() {
  return (
    <Page
      title="Add location"
      backAction={{ content: "Locations", url: "/app/locations" }}
    >
      <LocationForm mode="new" />
    </Page>
  );
}
