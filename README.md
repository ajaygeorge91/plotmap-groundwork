# Plotmap Groundwork

Try ideas on a piece of land before anything is built on it.

The idea: bring in a piece of land, see it as a virtual copy with its real
shape and slope, then place roads and buildings on it and divide it into plots,
the way you would in a building game. Keep several plans for the same land,
compare them, and hand the one you choose to a civil engineer as a clear sheet.

It is a web app. It runs in a browser from this folder and needs no internet.

## Status

Nothing of the product is built yet. This repository is the starting point:

- a web page that lists the sample lands
- four made-up sample lands to work with
- the tools to check, test, build and run the project
- checks that confirm the sample lands are sound

## Requirements

Node 22.12 or newer.

## Getting started

```sh
npm ci            # install the tools
npm run check     # typecheck, tests and a build
npm run dev       # serve the app at http://127.0.0.1:5173
```

With no internet, install from the offline package folder that ships next to
this repository in the upload archive:

```sh
npm ci --offline --cache ../plotmap-groundwork-offline-packages/npm-cache
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Serves `public/` at http://127.0.0.1:5173 and rebuilds `src/main.ts` on each page load |
| `npm run build` | Bundles `src/main.ts` into `public/dist/` |
| `npm run typecheck` | Checks the TypeScript in `src/`, `test/` and `scripts/` |
| `npm test` | Runs every `test/**/*.test.ts` with Node's built-in test runner |
| `npm run samples` | Rewrites the sample lands in `public/samples/` |
| `npm run check` | Typecheck, tests and build, in that order |

Tests are plain TypeScript files run directly by Node. They need nothing
installed beyond Node itself.

## Folders

| Path | Contents |
| --- | --- |
| `src/` | The app. `main.ts` is the page's entry point, `land.ts` describes a sample land |
| `public/` | What the browser is served: `index.html` and the sample lands |
| `public/samples/` | The sample lands, one JSON file each, plus `index.json` |
| `scripts/` | `make-samples.ts`, which writes the sample lands |
| `test/` | Tests |

## Sample lands

All four are made up. None is a real place, and no real owner, address or
location is involved.

| File | Size | Ground |
| --- | --- | --- |
| `meadow.json` | 2 acres | Almost flat rectangle |
| `hillside.json` | 10 acres | Four sides, one hill, a stream on the east side |
| `riverbend.json` | 25 acres | Seven sides, low ground, a river through it |
| `ridge.json` | 5 acres | L-shaped, steep slope climbing to the north |

Each file holds:

- `boundary`: the corners in metres, counter-clockwise. `x` grows to the east
  and `y` to the north.
- `areaSquareMetres` and `acres`: the area inside the boundary.
- `elevation`: ground heights in metres on a regular grid, row by row from the
  south, each row from west to east.
- `water`: streams and rivers as centre lines with a width.

`src/land.ts` has the full description. The format is only a starting point and
can change as the project needs. The files are generated, so change
`scripts/make-samples.ts` and run `npm run samples` instead of editing them by
hand; a test fails if the two disagree.

## Licence

Apache-2.0. See [LICENSE](LICENSE).
