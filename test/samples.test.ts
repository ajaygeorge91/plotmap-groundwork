// SPDX-License-Identifier: Apache-2.0
// Checks on the sample lands only. They prove the project's tools run and that
// the sample files are sound. They say nothing about the product.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SQUARE_METRES_PER_ACRE, type SampleIndexEntry, type SampleLand } from "../src/land.ts";
import { buildAll, buildIndex, signedArea, toFileText } from "../scripts/make-samples.ts";

const read = (name: string): string =>
  readFileSync(new URL(`../public/samples/${name}`, import.meta.url), "utf8");

const index = JSON.parse(read("index.json")) as SampleIndexEntry[];
const lands = index.map((entry) => JSON.parse(read(`${entry.id}.json`)) as SampleLand);

test("there are four sample lands with the expected sizes", () => {
  assert.deepEqual(
    index.map((entry) => [entry.id, entry.acres]),
    [["meadow", 2], ["hillside", 10], ["riverbend", 25], ["ridge", 5]],
  );
});

test("the files on disk are exactly what the generator writes", () => {
  const fresh = buildAll();
  assert.equal(read("index.json"), toFileText(buildIndex(fresh)));
  for (const land of fresh) {
    assert.equal(read(`${land.id}.json`), toFileText(land), land.id);
  }
});

for (const land of lands) {
  test(`${land.id}: boundary is counter-clockwise and its area matches the stated size`, () => {
    assert.ok(land.boundary.length >= 3);
    const area = signedArea(land.boundary);
    assert.ok(area > 0, "corners should run counter-clockwise");
    assert.ok(Math.abs(area - land.areaSquareMetres) < 0.2);
    assert.ok(Math.abs(area / SQUARE_METRES_PER_ACRE - land.acres) < 0.01);
  });

  test(`${land.id}: the height grid is complete and covers the whole boundary`, () => {
    const grid = land.elevation;
    assert.equal(grid.values.length, grid.cols * grid.rows);
    assert.ok(grid.values.every((height) => Number.isFinite(height)));
    const east = grid.originX + (grid.cols - 1) * grid.cellSize;
    const north = grid.originY + (grid.rows - 1) * grid.cellSize;
    for (const [x, y] of land.boundary) {
      assert.ok(x >= grid.originX && x <= east, `x ${x} is outside the grid`);
      assert.ok(y >= grid.originY && y <= north, `y ${y} is outside the grid`);
    }
  });

  test(`${land.id}: water lines have at least two points and a width`, () => {
    for (const course of land.water) {
      assert.ok(course.path.length >= 2);
      assert.ok(course.width > 0);
    }
  });
}

test("the ground is shaped the way each description says", () => {
  const range = (land: SampleLand): number =>
    Math.max(...land.elevation.values) - Math.min(...land.elevation.values);
  const byId = Object.fromEntries(lands.map((land) => [land.id, land]));
  assert.ok(range(byId["meadow"]!) < 2, "meadow is almost flat");
  assert.ok(range(byId["hillside"]!) > 20, "hillside has a real hill");
  assert.ok(range(byId["ridge"]!) > 30, "ridge is steep");
  assert.equal(byId["riverbend"]!.water[0]?.kind, "river");
  assert.equal(byId["hillside"]!.water[0]?.kind, "stream");
});
