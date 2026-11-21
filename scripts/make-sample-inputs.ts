// SPDX-License-Identifier: Apache-2.0
// Writes, for every sample land, the kind of files a person would bring to the
// app: a location, the boundary as walked with a phone, and a picture from above.
// Everything is made up. The locations are in open sea near 0°N 0°E on purpose,
// so no file here points at a real property. The pictures are drawn by this
// script from the sample land; none is a photograph.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";
import type { Point, SampleLand } from "../src/land.ts";
import { buildAll, toFileText } from "./make-samples.ts";

/** Metres in one degree, close to the equator. Good enough for land this small. */
export const METRES_PER_DEGREE_LATITUDE = 110_574;
export const METRES_PER_DEGREE_LONGITUDE = 111_320;

export const PICTURE_WIDTH = 900;

export interface SampleLocation {
  note: string;
  /** Where the land's south-west reference point (x = 0, y = 0) sits. */
  latitude: number;
  longitude: number;
}

export interface BoundaryFile {
  type: "Feature";
  properties: { name: string; note: string };
  geometry: { type: "Polygon"; coordinates: [longitude: number, latitude: number][][] };
}

export interface SampleInputIndexEntry {
  id: string;
  name: string;
  location: string;
  boundary: string;
  picture: string;
}

const NOTE = "Made up. This spot is open sea; it is not a real property.";

const round = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** Each sample gets its own made-up spot, a few kilometres apart. */
export function locationOf(land: SampleLand, position: number): SampleLocation {
  return {
    note: NOTE,
    latitude: round(0.02 + 0.03 * position, 6),
    longitude: round(0.05 + 0.04 * position, 6),
  };
}

export function toLongitudeLatitude([x, y]: Point, origin: SampleLocation): [number, number] {
  const latitude = origin.latitude + y / METRES_PER_DEGREE_LATITUDE;
  const longitude =
    origin.longitude + x / (METRES_PER_DEGREE_LONGITUDE * Math.cos((origin.latitude * Math.PI) / 180));
  return [round(longitude, 7), round(latitude, 7)];
}

export function boundaryFileOf(land: SampleLand, origin: SampleLocation): BoundaryFile {
  const ring = land.boundary.map((corner) => toLongitudeLatitude(corner, origin));
  ring.push(ring[0]!); // a GeoJSON ring repeats its first corner at the end
  return {
    type: "Feature",
    properties: { name: land.name, note: NOTE },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

// ---- picture from above ----------------------------------------------------

function isInside([px, py]: Point, corners: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const [xi, yi] = corners[i]!;
    const [xj, yj] = corners[j]!;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToPath(x: number, y: number, path: Point[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, ay] = path[i]!;
    const [bx, by] = path[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const along = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - (ax + along * dx), y - (ay + along * dy)));
  }
  return best;
}

/** A repeatable speckle between 0 and 1 for a pixel. No randomness. */
function speckle(col: number, row: number): number {
  let h = Math.imul(col, 374761393) ^ Math.imul(row, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function heightAt(land: SampleLand, x: number, y: number): number {
  const grid = land.elevation;
  const gx = Math.min(grid.cols - 1.001, Math.max(0, (x - grid.originX) / grid.cellSize));
  const gy = Math.min(grid.rows - 1.001, Math.max(0, (y - grid.originY) / grid.cellSize));
  const col = Math.floor(gx);
  const row = Math.floor(gy);
  const fx = gx - col;
  const fy = gy - row;
  const at = (r: number, c: number): number => grid.values[r * grid.cols + c]!;
  return (
    at(row, col) * (1 - fx) * (1 - fy) +
    at(row, col + 1) * fx * (1 - fy) +
    at(row + 1, col) * (1 - fx) * fy +
    at(row + 1, col + 1) * fx * fy
  );
}

export function pictureSize(land: SampleLand): { width: number; height: number; metresPerPixel: number } {
  const grid = land.elevation;
  const metresWide = (grid.cols - 1) * grid.cellSize;
  const metresTall = (grid.rows - 1) * grid.cellSize;
  const metresPerPixel = metresWide / PICTURE_WIDTH;
  return { width: PICTURE_WIDTH, height: Math.round(metresTall / metresPerPixel), metresPerPixel };
}

/** Draws the land as if seen from straight above, north at the top. Returns PNG bytes. */
export function drawPicture(land: SampleLand): Buffer {
  const { width, height, metresPerPixel } = pictureSize(land);
  const grid = land.elevation;
  const north = grid.originY + (grid.rows - 1) * grid.cellSize;
  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(rowBytes * height);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const x = grid.originX + col * metresPerPixel;
      const y = north - row * metresPerPixel;
      const inside = isInside([x, y], land.boundary);
      const grain = speckle(col, row);
      const patch = speckle(Math.floor(col / 9), Math.floor(row / 9));

      // Light from the north-west, so slopes read as light and dark sides.
      const step = Math.max(1, grid.cellSize / 2);
      const slopeX = (heightAt(land, x + step, y) - heightAt(land, x - step, y)) / (2 * step);
      const slopeY = (heightAt(land, x, y + step) - heightAt(land, x, y - step)) / (2 * step);
      const light = Math.min(1.25, Math.max(0.7, 1 + 1.4 * (slopeY - slopeX)));

      // Ground: planted land inside the boundary, rougher growth outside it.
      let red = inside ? 96 + 40 * patch : 58 + 30 * patch;
      let green = inside ? 150 + 50 * patch : 112 + 40 * patch;
      let blue = inside ? 70 + 20 * patch : 52 + 20 * patch;
      if (inside && grain > 0.82) [red, green, blue] = [104, 78, 62]; // bare soil showing through

      for (const pad of land.pads) {
        if (Math.hypot(x - pad.centre[0], y - pad.centre[1]) <= pad.radius) [red, green, blue] = [176, 96, 66];
      }
      for (const track of land.tracks) {
        if (distanceToPath(x, y, track.path) <= track.width / 2) {
          [red, green, blue] = track.kind === "road" ? [92, 94, 98] : [172, 92, 62];
        }
      }
      for (const course of land.water) {
        if (distanceToPath(x, y, course.path) <= course.width / 2) [red, green, blue] = [70, 118, 150];
      }

      const shade = light * (0.94 + 0.12 * grain);
      const offset = row * rowBytes + 1 + col * 3;
      raw[offset] = Math.min(255, Math.round(red * shade));
      raw[offset + 1] = Math.min(255, Math.round(green * shade));
      raw[offset + 2] = Math.min(255, Math.round(blue * shade));
    }
  }

  const chunk = (kind: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(kind, "latin1"), data]);
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per channel
  header[9] = 2; // colour type: red, green, blue
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function buildInputIndex(lands: SampleLand[]): SampleInputIndexEntry[] {
  return lands.map(({ id, name }) => ({
    id,
    name,
    location: `sample-inputs/${id}/location.json`,
    boundary: `sample-inputs/${id}/boundary.geojson`,
    picture: `sample-inputs/${id}/from-above.png`,
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const folder = fileURLToPath(new URL("../public/sample-inputs/", import.meta.url));
  const lands = buildAll();
  lands.forEach((land, position) => {
    const landFolder = `${folder}${land.id}/`;
    mkdirSync(landFolder, { recursive: true });
    const location = locationOf(land, position);
    writeFileSync(`${landFolder}location.json`, toFileText(location));
    writeFileSync(`${landFolder}boundary.geojson`, toFileText(boundaryFileOf(land, location)));
    writeFileSync(`${landFolder}from-above.png`, drawPicture(land));
  });
  writeFileSync(`${folder}index.json`, toFileText(buildInputIndex(lands)));
  console.log(`Wrote inputs for ${lands.length} sample lands to public/sample-inputs`);
}
