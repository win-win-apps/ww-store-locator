import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Text,
  List,
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { syncLocatorToMetafield } from "../utils/metafield.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  let settings = await prisma.locatorSettings.findUnique({
    where: { shop: session.shop },
  });
  if (!settings) {
    settings = await prisma.locatorSettings.create({
      data: { shop: session.shop },
    });
  }
  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const data = {
    pageTitle: String(form.get("pageTitle") || "Find a Store"),
    introText: String(form.get("introText") || "") || null,
    mapStyle: String(form.get("mapStyle") || "standard"),
    defaultZoom: Number(form.get("defaultZoom") || 4),
    defaultLat: Number(form.get("defaultLat") || 39.5),
    defaultLng: Number(form.get("defaultLng") || -98.35),
    radiusUnit: String(form.get("radiusUnit") || "mi"),
    defaultRadius: Number(form.get("defaultRadius") || 25),
    showDirections: form.get("showDirections") === "1",
    showPhone: form.get("showPhone") === "1",
    showHours: form.get("showHours") === "1",
    showSearchBar: form.get("showSearchBar") === "1",
    showRadiusFilter: form.get("showRadiusFilter") === "1",
    showTagFilter: form.get("showTagFilter") === "1",
    primaryColor: String(form.get("primaryColor") || "#1f2937"),
    pinColor: String(form.get("pinColor") || "#e53935"),
    googleMapsApiKey: String(form.get("googleMapsApiKey") || "") || null,
  };

  await prisma.locatorSettings.update({
    where: { shop: session.shop },
    data,
  });

  await syncLocatorToMetafield(session.shop);
  return redirect("/app/settings");
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();

  const [pageTitle, setPageTitle] = useState(settings.pageTitle);
  const [introText, setIntroText] = useState(settings.introText || "");
  const [mapStyle, setMapStyle] = useState(settings.mapStyle);
  const [defaultZoom, setDefaultZoom] = useState(String(settings.defaultZoom));
  const [defaultLat, setDefaultLat] = useState(String(settings.defaultLat));
  const [defaultLng, setDefaultLng] = useState(String(settings.defaultLng));
  const [radiusUnit, setRadiusUnit] = useState(settings.radiusUnit);
  const [defaultRadius, setDefaultRadius] = useState(
    String(settings.defaultRadius)
  );
  const [showDirections, setShowDirections] = useState(settings.showDirections);
  const [showPhone, setShowPhone] = useState(settings.showPhone);
  const [showHours, setShowHours] = useState(settings.showHours);
  const [showSearchBar, setShowSearchBar] = useState(settings.showSearchBar);
  const [showRadiusFilter, setShowRadiusFilter] = useState(
    settings.showRadiusFilter
  );
  const [showTagFilter, setShowTagFilter] = useState(settings.showTagFilter);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [pinColor, setPinColor] = useState(settings.pinColor);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState(
    settings.googleMapsApiKey || ""
  );

  return (
    <Page title="Settings">
      <Form method="post">
        <Layout>
          {!googleMapsApiKey && (
            <Layout.Section>
              <Banner tone="warning" title="Google Maps API key required">
                <p>
                  The store locator needs a google maps api key to render the
                  map and geocode new addresses. Creating one is free and takes
                  about a minute.
                </p>
                <List type="number">
                  <List.Item>
                    Go to{" "}
                    <a
                      href="https://console.cloud.google.com/google/maps-apis/start"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Google Cloud Console
                    </a>
                  </List.Item>
                  <List.Item>
                    Create a project, enable "Maps JavaScript API" and
                    "Geocoding API"
                  </List.Item>
                  <List.Item>Create an API key under Credentials</List.Item>
                  <List.Item>Paste it below and save</List.Item>
                </List>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Google Maps API key
                </Text>
                <TextField
                  label="API key"
                  name="googleMapsApiKey"
                  value={googleMapsApiKey}
                  onChange={setGoogleMapsApiKey}
                  autoComplete="off"
                  type="password"
                  helpText="Your own google maps api key. You are billed directly by google based on usage. Most small stores stay in the free tier."
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Page content
                </Text>
                <FormLayout>
                  <TextField
                    label="Page title"
                    name="pageTitle"
                    value={pageTitle}
                    onChange={setPageTitle}
                    autoComplete="off"
                  />
                  <TextField
                    label="Intro text"
                    name="introText"
                    value={introText}
                    onChange={setIntroText}
                    autoComplete="off"
                    multiline={2}
                    helpText="Optional, shown above the map"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Map defaults
                </Text>
                <FormLayout>
                  <FormLayout.Group>
                    <Select
                      label="Map style"
                      name="mapStyle"
                      options={[
                        { label: "Standard", value: "standard" },
                        { label: "Silver", value: "silver" },
                        { label: "Dark", value: "dark" },
                        { label: "Retro", value: "retro" },
                      ]}
                      value={mapStyle}
                      onChange={setMapStyle}
                    />
                    <Select
                      label="Radius unit"
                      name="radiusUnit"
                      options={[
                        { label: "Miles", value: "mi" },
                        { label: "Kilometers", value: "km" },
                      ]}
                      value={radiusUnit}
                      onChange={setRadiusUnit}
                    />
                  </FormLayout.Group>
                  <FormLayout.Group>
                    <TextField
                      label="Default zoom (1-20)"
                      name="defaultZoom"
                      type="number"
                      min={1}
                      max={20}
                      value={defaultZoom}
                      onChange={setDefaultZoom}
                      autoComplete="off"
                    />
                    <TextField
                      label="Default radius"
                      name="defaultRadius"
                      type="number"
                      min={1}
                      value={defaultRadius}
                      onChange={setDefaultRadius}
                      autoComplete="off"
                    />
                  </FormLayout.Group>
                  <FormLayout.Group>
                    <TextField
                      label="Default center lat"
                      name="defaultLat"
                      type="number"
                      value={defaultLat}
                      onChange={setDefaultLat}
                      autoComplete="off"
                      helpText="Where the map starts before a search"
                    />
                    <TextField
                      label="Default center lng"
                      name="defaultLng"
                      type="number"
                      value={defaultLng}
                      onChange={setDefaultLng}
                      autoComplete="off"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  What to show on storefront
                </Text>
                <input
                  type="hidden"
                  name="showDirections"
                  value={showDirections ? "1" : "0"}
                />
                <input
                  type="hidden"
                  name="showPhone"
                  value={showPhone ? "1" : "0"}
                />
                <input
                  type="hidden"
                  name="showHours"
                  value={showHours ? "1" : "0"}
                />
                <input
                  type="hidden"
                  name="showSearchBar"
                  value={showSearchBar ? "1" : "0"}
                />
                <input
                  type="hidden"
                  name="showRadiusFilter"
                  value={showRadiusFilter ? "1" : "0"}
                />
                <input
                  type="hidden"
                  name="showTagFilter"
                  value={showTagFilter ? "1" : "0"}
                />
                <Checkbox
                  label="Show directions button"
                  checked={showDirections}
                  onChange={setShowDirections}
                />
                <Checkbox
                  label="Show phone number"
                  checked={showPhone}
                  onChange={setShowPhone}
                />
                <Checkbox
                  label="Show store hours"
                  checked={showHours}
                  onChange={setShowHours}
                />
                <Checkbox
                  label="Show search bar"
                  checked={showSearchBar}
                  onChange={setShowSearchBar}
                />
                <Checkbox
                  label="Show radius filter"
                  checked={showRadiusFilter}
                  onChange={setShowRadiusFilter}
                />
                <Checkbox
                  label="Show service tag filter"
                  checked={showTagFilter}
                  onChange={setShowTagFilter}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Branding
                </Text>
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="Primary color"
                      name="primaryColor"
                      value={primaryColor}
                      onChange={setPrimaryColor}
                      autoComplete="off"
                      helpText="Buttons and highlights"
                    />
                    <TextField
                      label="Pin color"
                      name="pinColor"
                      value={pinColor}
                      onChange={setPinColor}
                      autoComplete="off"
                      helpText="Map marker color"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <InlineStack gap="300">
              <Button submit variant="primary">
                Save settings
              </Button>
              <Button url="/app">Cancel</Button>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </Form>
    </Page>
  );
}
