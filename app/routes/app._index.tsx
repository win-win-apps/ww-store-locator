import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  List,
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [locationCount, settings] = await Promise.all([
    prisma.location.count({ where: { shop } }),
    prisma.locatorSettings.findUnique({ where: { shop } }),
  ]);

  return json({
    shop,
    locationCount,
    hasApiKey: !!settings?.googleMapsApiKey,
    plan: settings?.plan || "free",
  });
};

export default function AppHome() {
  const { locationCount, hasApiKey, plan } = useLoaderData<typeof loader>();

  const showApiBanner = !hasApiKey;
  const showEmptyState = locationCount === 0;

  return (
    <Page title="Store Locator">
      <Layout>
        {showApiBanner && (
          <Layout.Section>
            <Banner
              title="Add your Google Maps API key"
              tone="warning"
              action={{ content: "Open Settings", url: "/app/settings" }}
            >
              <p>
                You need a Google Maps API key for the locator to render on
                your storefront. It takes about 60 seconds to create one in
                Google Cloud Console.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Welcome to Store Locator
              </Text>
              <Text as="p" tone="subdued">
                A google maps powered store finder for your storefront. Add
                your physical locations, pick a map style, and your customers
                can search by zip, filter by service, and get directions in one
                click.
              </Text>

              <InlineStack gap="300">
                <Button variant="primary" url="/app/locations/new">
                  Add your first location
                </Button>
                <Button url="/app/locations">Manage locations</Button>
                <Button url="/app/settings">Settings</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Status
              </Text>
              <List type="bullet">
                <List.Item>
                  Plan: <strong>{plan}</strong>
                </List.Item>
                <List.Item>
                  Locations: <strong>{locationCount}</strong>
                  {plan === "free" && " / 5 (free plan)"}
                </List.Item>
                <List.Item>
                  Google Maps API key:{" "}
                  <strong>{hasApiKey ? "set" : "missing"}</strong>
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        {showEmptyState && !showApiBanner && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Next step
                </Text>
                <Text as="p" tone="subdued">
                  Add at least one location and then open the theme editor and
                  drop the Store Locator block on a new page or on your contact
                  page. The app embed auto-injects the map script — no theme
                  editing needed.
                </Text>
                <InlineStack>
                  <Button variant="primary" url="/app/locations/new">
                    Add location
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
