// SPDX-License-Identifier: Apache-2.0
// Checks on the sample lands only. They prove the project's tools run and that
// the sample files are sound. They say nothing about the product.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SQUARE_METRES_PER_ACRE, type Point, type SampleIndexEntry, type SampleLand } from "../src/land.ts";
import { buildAll, buildIndex, signedArea, toFileText } from "../scripts/make-samples.ts";

/** True when the point is inside the polygon (points on an edge may go either way). */
function isInside([px, py]: Point, corners: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const [xi, yi] = corners[i]!;
    const [xj, yj] = corners[j]!;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const read = (name: string): string =>
  readFileSync(new URL(`../public/samples/${name}`, import.meta.url), "utf8");

const index = JSON.parse(read("index.json")) as SampleIndexEntry[];
const lands = index.map((entry) => JSON.parse(read(`${entry.id}.json`)) as SampleLand);

test("there are six sample lands with the expected sizes", () => {
  assert.deepEqual(
    index.map((entry) => [entry.id, entry.acres]),
    [
      ["meadow", 2],
      ["hillside", 10],
      ["riverbend", 25],
      ["ridge", 5],
      ["switchback", 1.73],
      ["terrace", 2],
    ],
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

  test(`${land.id}: tracks inside the land stay inside the boundary`, () => {
    for (const track of land.tracks) {
      assert.ok(track.path.length >= 2);
      assert.ok(track.width > 0);
      if (track.kind !== "track") continue;
      for (const point of track.path) {
        assert.ok(isInside(point, land.boundary), `${point} is outside the boundary`);
      }
    }
  });

  test(`${land.id}: levelled patches are inside the boundary and level`, () => {
    for (const pad of land.pads) {
      assert.ok(isInside(pad.centre, land.boundary));
      const grid = land.elevation;
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const x = grid.originX + col * grid.cellSize;
          const y = grid.originY + row * grid.cellSize;
          if (Math.hypot(x - pad.centre[0], y - pad.centre[1]) > pad.radius) continue;
          assert.equal(grid.values[row * grid.cols + col], pad.level);
        }
      }
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
  assert.ok(range(byId["switchback"]!) > 10, "switchback is a real slope");
  assert.ok(range(byId["terrace"]!) > 10, "terrace climbs about as much as switchback");
  assert.equal(byId["switchback"]!.tracks.filter((track) => track.kind === "track").length, 3);
  assert.equal(byId["switchback"]!.pads.length, 1);
  assert.equal(byId["riverbend"]!.water[0]?.kind, "river");
  assert.equal(byId["hillside"]!.water[0]?.kind, "stream");
});
