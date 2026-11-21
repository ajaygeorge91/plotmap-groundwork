// SPDX-License-Identifier: Apache-2.0
// Checks on the made-up input files (location, boundary, picture from above).
// Like the sample land checks, they say nothing about the product.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SQUARE_METRES_PER_ACRE } from "../src/land.ts";
import { buildAll, toFileText } from "../scripts/make-samples.ts";
import {
  METRES_PER_DEGREE_LATITUDE,
  METRES_PER_DEGREE_LONGITUDE,
  boundaryFileOf,
  buildInputIndex,
  locationOf,
  pictureSize,
  type BoundaryFile,
  type SampleLocation,
} from "../scripts/make-sample-inputs.ts";

const folder = new URL("../public/sample-inputs/", import.meta.url);
const readText = (name: string): string => readFileSync(new URL(name, folder), "utf8");
const lands = buildAll();

test("the input index lists every sample land", () => {
  assert.equal(readText("index.json"), toFileText(buildInputIndex(lands)));
});

lands.forEach((land, position) => {
  test(`${land.id}: the location is the made-up one, in open sea near 0°N 0°E`, () => {
    const location = JSON.parse(readText(`${land.id}/location.json`)) as SampleLocation;
    assert.deepEqual(location, locationOf(land, position));
    assert.ok(location.latitude > 0 && location.latitude < 0.5);
    assert.ok(location.longitude > 0 && location.longitude < 0.5);
  });

  test(`${land.id}: the walked boundary is a closed ring with the right area`, () => {
    const text = readText(`${land.id}/boundary.geojson`);
    assert.equal(text, toFileText(boundaryFileOf(land, locationOf(land, position))));
    const ring = (JSON.parse(text) as BoundaryFile).geometry.coordinates[0]!;
    assert.equal(ring.length, land.boundary.length + 1);
    assert.deepEqual(ring[0], ring[ring.length - 1]);

    // Turn degrees back into metres and measure the area.
    const [lon0, lat0] = ring[0]!;
    const metres = ring.slice(0, -1).map(([lon, lat]) => [
      (lon - lon0) * METRES_PER_DEGREE_LONGITUDE * Math.cos((lat0 * Math.PI) / 180),
      (lat - lat0) * METRES_PER_DEGREE_LATITUDE,
    ]);
    let twice = 0;
    for (let i = 0; i < metres.length; i++) {
      const [x1, y1] = metres[i]!;
      const [x2, y2] = metres[(i + 1) % metres.length]!;
      twice += x1! * y2! - x2! * y1!;
    }
    const acres = twice / 2 / SQUARE_METRES_PER_ACRE;
    assert.ok(Math.abs(acres - land.acres) / land.acres < 0.01, `${acres} acres`);
  });

  test(`${land.id}: the picture from above is a PNG of the expected size`, () => {
    const bytes = readFileSync(new URL(`${land.id}/from-above.png`, folder));
    assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const expected = pictureSize(land);
    assert.equal(bytes.readUInt32BE(16), expected.width);
    assert.equal(bytes.readUInt32BE(20), expected.height);
  });
});
