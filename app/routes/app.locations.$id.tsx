import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import { Page, Banner } from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { syncLocatorToMetafield } from "../utils/metafield.server";
import { geocodeAddress } from "../utils/geocode.server";
import LocationForm from "../components/LocationForm";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const loc = await prisma.location.findUnique({
    where: { id: String(params.id) },
  });
  if (!loc || loc.shop !== session.shop) {
    throw new Response("Not found", { status: 404 });
  }
  return json({ location: loc });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const id = String(params.id);

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing || existing.shop !== session.shop) {
    throw new Response("Not found", { status: 404 });
  }

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

  const addressChanged =
    fields.addressLine1 !== existing.addressLine1 ||
    fields.addressLine2 !== existing.addressLine2 ||
    fields.city !== existing.city ||
    fields.region !== existing.region ||
    fields.postalCode !== existing.postalCode ||
    fields.country !== existing.country;

  let lat = existing.lat;
  let lng = existing.lng;
  let geocodeError = existing.geocodeError;

  if (addressChanged || !existing.lat || !existing.lng) {
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
    lat = geo.lat;
    lng = geo.lng;
    geocodeError = geo.error;
  }

  await prisma.location.update({
    where: { id },
    data: { ...fields, lat, lng, geocodeError },
  });

  await syncLocatorToMetafield(session.shop);
  return redirect("/app/locations");
};

export default function EditLocation() {
  const { location } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <Page
      title={`Edit: ${location.name}`}
      backAction={{ content: "Locations", url: "/app/locations" }}
    >
      {actionData?.error && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="critical" title="Error">
            <p>{actionData.error}</p>
          </Banner>
        </div>
      )}
      <LocationForm mode="edit" initial={location as any} />
    </Page>
  );
}
