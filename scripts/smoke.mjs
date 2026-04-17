#!/usr/bin/env node
// Pure-logic smoke test for store locator.
// Tests: haversine, open-now, hours parse, metafield serialization,
// radius filter, tag filter. No shopify install required.

import assert from "node:assert/strict";

// --- Haversine (miles + km) ---
function haversine(aLat, aLng, bLat, bLng, unit = "km") {
  const R = unit === "mi" ? 3958.8 : 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// NYC (Times Square) to Brooklyn (Barclays Center) ~ 6.3 km straight line
const d_km = haversine(40.758, -73.9855, 40.6826, -73.9754, "km");
assert.ok(d_km > 8 && d_km < 10, `NYC->Brooklyn km expected 8-10, got ${d_km}`);
const d_mi = haversine(40.758, -73.9855, 40.6826, -73.9754, "mi");
assert.ok(d_mi > 5 && d_mi < 7, `NYC->Brooklyn mi expected 5-7, got ${d_mi}`);
console.log("OK haversine: NYC->Brooklyn", d_km.toFixed(2), "km /", d_mi.toFixed(2), "mi");

// Identity: same point => 0
assert.equal(haversine(40, -73, 40, -73, "km"), 0);
console.log("OK haversine: identity is zero");

// --- Hours parsing + open now ---
function isOpenNow(hours, nowDate) {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const d = days[nowDate.getDay()];
  const entry = hours?.[d];
  if (!entry || entry.closed) return false;
  const [openH, openM] = entry.open.split(":").map(Number);
  const [closeH, closeM] = entry.close.split(":").map(Number);
  const cur = nowDate.getHours() * 60 + nowDate.getMinutes();
  const o = openH * 60 + openM;
  const c = closeH * 60 + closeM;
  return cur >= o && cur < c;
}

const hours = {
  mon: { open: "09:00", close: "18:00", closed: false },
  tue: { open: "09:00", close: "18:00", closed: false },
  wed: { open: "09:00", close: "18:00", closed: false },
  thu: { open: "09:00", close: "18:00", closed: false },
  fri: { open: "09:00", close: "18:00", closed: false },
  sat: { open: "10:00", close: "16:00", closed: false },
  sun: { open: "00:00", close: "00:00", closed: true },
};

// Monday 10am => open
assert.equal(isOpenNow(hours, new Date("2026-04-13T10:00:00")), true);
// Monday 8am => closed (before open)
assert.equal(isOpenNow(hours, new Date("2026-04-13T08:00:00")), false);
// Monday 6:30pm => closed (after close)
assert.equal(isOpenNow(hours, new Date("2026-04-13T18:30:00")), false);
// Sunday 12pm => closed flag
assert.equal(isOpenNow(hours, new Date("2026-04-12T12:00:00")), false);
// Saturday 11am => open (different hours day)
assert.equal(isOpenNow(hours, new Date("2026-04-11T11:00:00")), true);
console.log("OK open now: 5 cases pass");

// --- Radius filter ---
function filterByRadius(locations, centerLat, centerLng, radius, unit) {
  return locations
    .map((l) => ({ ...l, distance: haversine(centerLat, centerLng, l.lat, l.lng, unit) }))
    .filter((l) => l.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

const locations = [
  { id: 1, name: "Times Square", lat: 40.758, lng: -73.9855, tags: ["pickup"] },
  { id: 2, name: "Brooklyn", lat: 40.6826, lng: -73.9754, tags: ["repairs", "pickup"] },
  { id: 3, name: "Jersey City", lat: 40.7178, lng: -74.0431, tags: [] },
  { id: 4, name: "Boston", lat: 42.3601, lng: -71.0589, tags: ["pickup"] },
];

// 10 km radius from Times Square => should include TS + Brooklyn + JC, exclude Boston
const r10 = filterByRadius(locations, 40.758, -73.9855, 10, "km");
assert.equal(r10.length, 3, `10km radius expected 3, got ${r10.length}`);
assert.equal(r10[0].id, 1, "nearest should be Times Square itself");
console.log("OK radius filter: 10km from TS keeps 3, excludes Boston");

// 1 km radius => only Times Square
const r1 = filterByRadius(locations, 40.758, -73.9855, 1, "km");
assert.equal(r1.length, 1);
console.log("OK radius filter: 1km keeps only the center");

// --- Tag filter ---
function filterByTag(locations, tag) {
  if (!tag) return locations;
  return locations.filter((l) => l.tags?.includes(tag));
}

assert.equal(filterByTag(locations, "repairs").length, 1);
assert.equal(filterByTag(locations, "pickup").length, 3);
assert.equal(filterByTag(locations, null).length, 4);
console.log("OK tag filter: repairs=1, pickup=3, null=all");

// --- Metafield serialization roundtrip ---
const config = {
  pageTitle: "Find a store",
  mapStyle: "silver",
  defaultZoom: 4,
  defaultLat: 40.0,
  defaultLng: -100.0,
  radiusUnit: "mi",
  showDirections: true,
  showPhone: true,
  showHours: true,
  showSearch: true,
  showRadiusFilter: true,
  showTagFilter: false,
  primaryColor: "#1e40af",
  pinColor: "#10b981",
};
const roundtrip = JSON.parse(JSON.stringify(config));
assert.deepEqual(roundtrip, config);
console.log("OK config JSON roundtrip");

const locationsPayload = locations.map((l) => ({
  id: l.id,
  name: l.name,
  lat: l.lat,
  lng: l.lng,
  tags: l.tags,
  hours,
}));
const sizeKb = Buffer.byteLength(JSON.stringify(locationsPayload), "utf8") / 1024;
assert.ok(sizeKb < 100, `payload size ${sizeKb}kb exceeds 100kb budget`);
console.log(`OK locations payload: ${sizeKb.toFixed(2)} kb (budget 100kb)`);

console.log("\nAll smoke tests passed.");
