import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Badge,
  Text,
  Button,
  EmptyState,
  BlockStack,
  InlineStack,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { syncLocatorToMetafield } from "../utils/metafield.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const locations = await prisma.location.findMany({
    where: { shop: session.shop },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return json({ locations });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  const id = String(form.get("id") || "");

  if (intent === "toggle" && id) {
    const loc = await prisma.location.findUnique({ where: { id } });
    if (loc && loc.shop === session.shop) {
      await prisma.location.update({
        where: { id },
        data: { isActive: !loc.isActive },
      });
    }
  }

  if (intent === "delete" && id) {
    const loc = await prisma.location.findUnique({ where: { id } });
    if (loc && loc.shop === session.shop) {
      await prisma.location.delete({ where: { id } });
    }
  }

  await syncLocatorToMetafield(session.shop);
  return redirect("/app/locations");
};

export default function LocationsIndex() {
  const { locations } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const resourceName = { singular: "location", plural: "locations" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(locations as any);

  if (locations.length === 0) {
    return (
      <Page
        title="Locations"
        primaryAction={{
          content: "Add location",
          url: "/app/locations/new",
        }}
      >
        <Card>
          <EmptyState
            heading="No locations yet"
            action={{ content: "Add location", url: "/app/locations/new" }}
            image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
          >
            <p>
              Add your physical stores, dealer locations, or pickup points.
              They will appear on the map on your storefront.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rowMarkup = locations.map((loc, index) => (
    <IndexTable.Row
      id={loc.id}
      key={loc.id}
      position={index}
      selected={selectedResources.includes(loc.id)}
    >
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {loc.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued">
          {[loc.city, loc.region].filter(Boolean).join(", ")}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {loc.lat && loc.lng ? (
          <Badge tone="success">Geocoded</Badge>
        ) : (
          <Badge tone="critical">Not geocoded</Badge>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {loc.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge>Inactive</Badge>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="200">
          <Button url={`/app/locations/${loc.id}`} size="micro">
            Edit
          </Button>
          <Button
            size="micro"
            onClick={() => {
              const fd = new FormData();
              fd.set("intent", "toggle");
              fd.set("id", loc.id);
              submit(fd, { method: "post" });
            }}
          >
            {loc.isActive ? "Disable" : "Enable"}
          </Button>
          <Button
            size="micro"
            tone="critical"
            onClick={() => {
              if (!confirm(`Delete "${loc.name}"?`)) return;
              const fd = new FormData();
              fd.set("intent", "delete");
              fd.set("id", loc.id);
              submit(fd, { method: "post" });
            }}
          >
            Delete
          </Button>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Locations"
      primaryAction={{
        content: "Add location",
        url: "/app/locations/new",
      }}
    >
      <Card padding="0">
        <IndexTable
          resourceName={resourceName}
          itemCount={locations.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Name" },
            { title: "City / Region" },
            { title: "Geocode" },
            { title: "Status" },
            { title: "Actions" },
          ]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}
