// SPDX-License-Identifier: Apache-2.0
// Writes the made-up sample lands into public/samples. No randomness: running it
// again gives exactly the same files. None of these lands is a real place.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  SQUARE_METRES_PER_ACRE,
  type ElevationGrid,
  type Pad,
  type Point,
  type SampleIndexEntry,
  type SampleLand,
  type Track,
  type Watercourse,
} from "../src/land.ts";

const round = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** Area of a polygon from its corners (shoelace formula). Positive when counter-clockwise. */
export function signedArea(corners: Point[]): number {
  let twice = 0;
  for (let i = 0; i < corners.length; i++) {
    const [x1, y1] = corners[i]!;
    const [x2, y2] = corners[(i + 1) % corners.length]!;
    twice += x1 * y2 - x2 * y1;
  }
  return twice / 2;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  acres: number;
  /** Rough outline, counter-clockwise. It is scaled so the area matches `acres`. */
  outline: Point[];
  cellSize: number;
  /** Height of the ground at a point, in metres, before rounding. */
  height: (x: number, y: number) => number;
  /** Water, in the same rough coordinates as the outline. */
  water: Watercourse[];
  /** Tracks and roads that are already there, in the rough coordinates. */
  tracks?: Track[];
  /** Levelled patches, in the rough coordinates. The level is read from `height`. */
  pads?: { name: string; centre: Point; radius: number }[];
}

const bump = (x: number, y: number, cx: number, cy: number, spread: number, peak: number): number =>
  peak * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * spread ** 2));

/** 0 below `from`, 1 above `to`, smooth in between. */
const ease = (value: number, from: number, to: number): number => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

// Switchback: a slope that climbs to the north, with one patch levelled near the entrance.
const switchbackPad = { name: "Levelled patch by the entrance", centre: [92, 18] as Point, radius: 8 };
const switchbackSlope = (x: number, y: number): number => 64 + 0.17 * y + 0.03 * (110 - x);
const switchbackHeight = (x: number, y: number): number => {
  const [px, py] = switchbackPad.centre;
  const distance = Math.hypot(x - px, y - py);
  const natural = ease(distance, switchbackPad.radius, switchbackPad.radius + 5);
  return switchbackSlope(px, py) * (1 - natural) + switchbackSlope(x, y) * natural;
};

// Terrace: the same overall climb as Switchback, cut into steps 12 metres deep.
const terraceHeight = (x: number, y: number): number => {
  const step = y / 12;
  const whole = Math.floor(step);
  return 71 + 2.04 * (whole + ease(step - whole, 0.75, 1)) + 0.01 * x;
};

const recipes: Recipe[] = [
  {
    id: "meadow",
    name: "Meadow",
    description: "A small, almost flat rectangle. The simple case.",
    acres: 2,
    outline: [[0, 0], [110, 0], [110, 73], [0, 73]],
    cellSize: 5,
    height: (x, y) => 82 + 0.004 * x + 0.006 * y,
    water: [],
  },
  {
    id: "hillside",
    name: "Hillside",
    description: "Four sides, one hill west of the middle and a stream down the east side.",
    acres: 10,
    outline: [[0, 10], [270, 0], [285, 150], [15, 160]],
    cellSize: 5,
    height: (x, y) => 108 + bump(x, y, 115, 85, 55, 32) - 0.03 * Math.max(0, x - 200),
    water: [{ kind: "stream", width: 3, path: [[245, 155], [262, 110], [250, 70], [268, 30], [262, 2]] }],
  },
  {
    id: "riverbend",
    name: "Riverbend",
    description: "A large piece with seven sides, low ground and a river curving through it.",
    acres: 25,
    outline: [[0, 120], [40, 20], [210, 0], [400, 30], [440, 170], [330, 290], [120, 270]],
    cellSize: 10,
    height: (x, y) => {
      const riverY = 150 + 55 * Math.sin(x / 70);
      const away = Math.abs(y - riverY);
      return 41 + Math.min(9, away * 0.06) + 0.004 * x;
    },
    water: [
      {
        kind: "river",
        width: 14,
        path: [[10, 158], [70, 196], [140, 199], [210, 158], [280, 108], [340, 96], [400, 126], [436, 150]],
      },
    ],
  },
  {
    id: "ridge",
    name: "Ridge",
    description: "An L-shaped piece on a steep slope that climbs to the north.",
    acres: 5,
    outline: [[0, 0], [200, 0], [200, 55], [110, 55], [110, 150], [0, 150]],
    cellSize: 5,
    height: (x, y) => 212 + 0.22 * y + 0.02 * x + bump(x, y, 55, 120, 30, 6),
    water: [],
  },
  {
    id: "switchback",
    name: "Switchback",
    description:
      "A six-sided slope that climbs to the north. An unpaved track winds up it from an entrance in the south-east corner and forks near the top. One patch by the entrance is levelled, and a public road passes the south-east side.",
    acres: 1.73,
    outline: [[0, 25], [55, 0], [105, 8], [110, 60], [70, 85], [10, 75]],
    cellSize: 2,
    height: switchbackHeight,
    water: [],
    tracks: [
      { kind: "road", width: 7, path: [[40, -9], [80, -5], [118, 5]] },
      { kind: "track", width: 3.5, path: [[98, 8], [88, 22], [60, 24], [40, 30], [38, 42], [62, 46], [84, 52]] },
      { kind: "track", width: 3, path: [[84, 52], [60, 62], [30, 62]] },
      { kind: "track", width: 3, path: [[84, 52], [100, 60], [104, 62]] },
    ],
    pads: [switchbackPad],
  },
  {
    id: "terrace",
    name: "Terrace",
    description:
      "Four sides on the same climb as Switchback, cut into level steps about 12 metres deep.",
    acres: 2,
    outline: [[0, 0], [95, 6], [100, 84], [8, 90]],
    cellSize: 2,
    height: terraceHeight,
    water: [],
  },
];

export function buildSample(recipe: Recipe): SampleLand {
  const target = recipe.acres * SQUARE_METRES_PER_ACRE;
  const scale = Math.sqrt(target / signedArea(recipe.outline));
  const scalePoint = ([x, y]: Point): Point => [round(x * scale, 2), round(y * scale, 2)];
  const boundary = recipe.outline.map(scalePoint);

  const xs = boundary.map(([x]) => x);
  const ys = boundary.map(([, y]) => y);
  const margin = recipe.cellSize * 2;
  const originX = Math.floor((Math.min(...xs) - margin) / recipe.cellSize) * recipe.cellSize;
  const originY = Math.floor((Math.min(...ys) - margin) / recipe.cellSize) * recipe.cellSize;
  const cols = Math.ceil((Math.max(...xs) + margin - originX) / recipe.cellSize) + 1;
  const rows = Math.ceil((Math.max(...ys) + margin - originY) / recipe.cellSize) + 1;
  const values: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = originX + col * recipe.cellSize;
      const y = originY + row * recipe.cellSize;
      // The height recipe is written in the rough coordinates, so scale back.
      values.push(round(recipe.height(x / scale, y / scale), 1));
    }
  }
  const elevation: ElevationGrid = { originX, originY, cellSize: recipe.cellSize, cols, rows, values };

  const areaSquareMetres = round(signedArea(boundary), 1);
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    units: "metres",
    areaSquareMetres,
    acres: round(areaSquareMetres / SQUARE_METRES_PER_ACRE, 2),
    boundary,
    elevation,
    water: recipe.water.map((course) => ({ ...course, path: course.path.map(scalePoint) })),
    tracks: (recipe.tracks ?? []).map((track) => ({ ...track, path: track.path.map(scalePoint) })),
    pads: (recipe.pads ?? []).map(
      (pad): Pad => ({
        name: pad.name,
        centre: scalePoint(pad.centre),
        radius: round(pad.radius * scale, 2),
        level: round(recipe.height(pad.centre[0], pad.centre[1]), 1),
      }),
    ),
  };
}

export function buildAll(): SampleLand[] {
  return recipes.map(buildSample);
}

export function toFileText(value: unknown): string {
  return JSON.stringify(value) + "\n";
}

export function buildIndex(samples: SampleLand[]): SampleIndexEntry[] {
  return samples.map(({ id, name, acres }) => ({ id, name, acres, file: `samples/${id}.json` }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const folder = fileURLToPath(new URL("../public/samples/", import.meta.url));
  mkdirSync(folder, { recursive: true });
  const samples = buildAll();
  for (const sample of samples) {
    writeFileSync(`${folder}${sample.id}.json`, toFileText(sample));
  }
  writeFileSync(`${folder}index.json`, toFileText(buildIndex(samples)));
  console.log(`Wrote ${samples.length} sample lands to public/samples`);
}
