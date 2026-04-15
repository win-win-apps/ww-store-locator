import { useState } from "react";
import { Form } from "@remix-run/react";
import {
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  BlockStack,
  InlineStack,
  Button,
  Text,
  Banner,
  Tag,
} from "@shopify/polaris";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export interface LocationFormProps {
  initial?: {
    id?: string;
    name?: string;
    description?: string | null;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    region?: string | null;
    postalCode?: string | null;
    country?: string;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    hours?: string;
    tags?: string;
    isActive?: boolean;
    geocodeError?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  mode: "new" | "edit";
}

interface HoursRow {
  closed: boolean;
  open: string;
  close: string;
}

export default function LocationForm({ initial, mode }: LocationFormProps) {
  const i = initial || {};

  const initialHours = (() => {
    try {
      return JSON.parse(i.hours || "{}");
    } catch {
      return {};
    }
  })();

  const initialTags: string[] = (() => {
    try {
      return JSON.parse(i.tags || "[]");
    } catch {
      return [];
    }
  })();

  const [name, setName] = useState(i.name || "");
  const [description, setDescription] = useState(i.description || "");
  const [addressLine1, setAddressLine1] = useState(i.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(i.addressLine2 || "");
  const [city, setCity] = useState(i.city || "");
  const [region, setRegion] = useState(i.region || "");
  const [postalCode, setPostalCode] = useState(i.postalCode || "");
  const [country, setCountry] = useState(i.country || "United States");
  const [phone, setPhone] = useState(i.phone || "");
  const [email, setEmail] = useState(i.email || "");
  const [website, setWebsite] = useState(i.website || "");
  const [isActive, setIsActive] = useState(i.isActive !== false);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");

  const [hours, setHours] = useState<Record<string, HoursRow>>(() => {
    const h: Record<string, HoursRow> = {};
    for (const d of DAYS) {
      h[d.key] = initialHours[d.key] || {
        closed: false,
        open: "09:00",
        close: "17:00",
      };
    }
    return h;
  });

  const addTag = () => {
    const clean = tagInput.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const updateHours = (key: string, field: keyof HoursRow, val: any) => {
    setHours({
      ...hours,
      [key]: { ...hours[key], [field]: val },
    });
  };

  return (
    <Form method="post">
      <input type="hidden" name="intent" value="save" />
      {i.id && <input type="hidden" name="id" value={i.id} />}
      <input type="hidden" name="hours" value={JSON.stringify(hours)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="isActive" value={isActive ? "1" : "0"} />

      <BlockStack gap="400">
        {i.geocodeError && (
          <Banner tone="warning" title="Last geocode failed">
            <p>{i.geocodeError}</p>
            <p>
              Fix the address and save again. Make sure your Google Maps API
              key in Settings is valid and has the Geocoding API enabled.
            </p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Store info
            </Text>
            <FormLayout>
              <TextField
                label="Store name"
                name="name"
                value={name}
                onChange={setName}
                autoComplete="off"
                requiredIndicator
              />
              <TextField
                label="Description"
                name="description"
                value={description}
                onChange={setDescription}
                autoComplete="off"
                multiline={2}
                helpText="Shown on the storefront below the store name"
              />
              <Checkbox
                label="Active (show on storefront)"
                checked={isActive}
                onChange={setIsActive}
              />
            </FormLayout>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Address
            </Text>
            <FormLayout>
              <TextField
                label="Address line 1"
                name="addressLine1"
                value={addressLine1}
                onChange={setAddressLine1}
                autoComplete="street-address"
                requiredIndicator
              />
              <TextField
                label="Address line 2"
                name="addressLine2"
                value={addressLine2}
                onChange={setAddressLine2}
                autoComplete="off"
              />
              <FormLayout.Group>
                <TextField
                  label="City"
                  name="city"
                  value={city}
                  onChange={setCity}
                  autoComplete="off"
                  requiredIndicator
                />
                <TextField
                  label="Region / State"
                  name="region"
                  value={region}
                  onChange={setRegion}
                  autoComplete="off"
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="Postal code"
                  name="postalCode"
                  value={postalCode}
                  onChange={setPostalCode}
                  autoComplete="postal-code"
                />
                <TextField
                  label="Country"
                  name="country"
                  value={country}
                  onChange={setCountry}
                  autoComplete="country"
                />
              </FormLayout.Group>
            </FormLayout>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Contact
            </Text>
            <FormLayout>
              <FormLayout.Group>
                <TextField
                  label="Phone"
                  name="phone"
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />
              </FormLayout.Group>
              <TextField
                label="Website"
                name="website"
                value={website}
                onChange={setWebsite}
                autoComplete="url"
                placeholder="https://example.com"
              />
            </FormLayout>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Hours
            </Text>
            {DAYS.map((d) => (
              <InlineStack
                key={d.key}
                gap="300"
                align="start"
                blockAlign="center"
              >
                <div style={{ minWidth: 120 }}>
                  <Text as="span" variant="bodyMd">
                    {d.label}
                  </Text>
                </div>
                <Checkbox
                  label="Closed"
                  checked={hours[d.key].closed}
                  onChange={(v) => updateHours(d.key, "closed", v)}
                />
                {!hours[d.key].closed && (
                  <>
                    <TextField
                      label="Open"
                      labelHidden
                      type="time"
                      value={hours[d.key].open}
                      onChange={(v) => updateHours(d.key, "open", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Close"
                      labelHidden
                      type="time"
                      value={hours[d.key].close}
                      onChange={(v) => updateHours(d.key, "close", v)}
                      autoComplete="off"
                    />
                  </>
                )}
              </InlineStack>
            ))}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Service tags
            </Text>
            <Text as="p" tone="subdued">
              Optional tags that let customers filter the map (e.g. "warranty",
              "pickup", "repairs"). Press Enter or click Add.
            </Text>
            <InlineStack gap="200">
              <TextField
                label="New tag"
                labelHidden
                value={tagInput}
                onChange={setTagInput}
                autoComplete="off"
                placeholder="e.g. warranty"
                onBlur={addTag}
              />
              <Button onClick={addTag}>Add</Button>
            </InlineStack>
            <InlineStack gap="200">
              {tags.map((t) => (
                <Tag key={t} onRemove={() => removeTag(t)}>
                  {t}
                </Tag>
              ))}
            </InlineStack>
          </BlockStack>
        </Card>

        <InlineStack gap="300">
          <Button submit variant="primary">
            {mode === "new" ? "Create location" : "Save changes"}
          </Button>
          <Button url="/app/locations">Cancel</Button>
        </InlineStack>
      </BlockStack>
    </Form>
  );
}
