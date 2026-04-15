/**
 * Server-side geocoding using Google Geocoding API.
 *
 * Uses the merchant's own API key pulled from LocatorSettings. We never ship
 * a platform key for this — Google will bill whoever's key is used, and we
 * do not want to be on the hook for merchant geocoding usage.
 *
 * Failure modes are returned rather than thrown. Admin UI displays the
 * geocodeError on the location row if geocoding did not succeed.
 */

export interface GeocodeResult {
  lat: number | null;
  lng: number | null;
  error: string | null;
}

export async function geocodeAddress(
  address: string,
  apiKey: string | null | undefined
): Promise<GeocodeResult> {
  if (!address || address.trim().length === 0) {
    return { lat: null, lng: null, error: "Address is empty" };
  }
  if (!apiKey) {
    return {
      lat: null,
      lng: null,
      error: "Google Maps API key not set in Settings",
    };
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      return { lat: null, lng: null, error: `Google HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      error_message?: string;
    };

    if (body.status !== "OK" || body.results.length === 0) {
      return {
        lat: null,
        lng: null,
        error:
          body.error_message ||
          `Google status ${body.status} — no match for address`,
      };
    }

    const loc = body.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng, error: null };
  } catch (err) {
    return {
      lat: null,
      lng: null,
      error: `Geocode request failed: ${(err as Error).message}`,
    };
  }
}
