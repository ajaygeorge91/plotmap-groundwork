// SPDX-License-Identifier: Apache-2.0

/** Square metres in one acre. */
export const SQUARE_METRES_PER_ACRE = 4046.8564224;

/** A point on the ground, in metres. x grows to the east, y grows to the north. */
export type Point = [x: number, y: number];

/** Heights of the ground on a regular grid. */
export interface ElevationGrid {
  /** Position of the south-west corner of the grid, in metres. */
  originX: number;
  originY: number;
  /** Distance between neighbouring grid points, in metres. */
  cellSize: number;
  cols: number;
  rows: number;
  /** Heights in metres, row by row from the south, each row from west to east. */
  values: number[];
}

export interface Watercourse {
  kind: "stream" | "river";
  /** Width in metres. */
  width: number;
  /** Centre line, in metres. */
  path: Point[];
}

/** One sample piece of land, as stored in public/samples/<id>.json. */
export interface SampleLand {
  id: string;
  name: string;
  description: string;
  units: "metres";
  /** Area inside the boundary. */
  areaSquareMetres: number;
  acres: number;
  /** Corners of the boundary in order, counter-clockwise. The last corner joins the first. */
  boundary: Point[];
  elevation: ElevationGrid;
  water: Watercourse[];
}

export interface SampleIndexEntry {
  id: string;
  name: string;
  acres: number;
  file: string;
}
