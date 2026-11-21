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
- six made-up sample lands to work with
- for each land, the files a person would bring: a location, the boundary as
  walked with a phone, and a picture from above
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
| `npm run samples` | Rewrites the sample lands in `public/samples/` and their input files in `public/sample-inputs/` |
| `npm run check` | Typecheck, tests and build, in that order |

Tests are plain TypeScript files run directly by Node. They need nothing
installed beyond Node itself.

## Folders

| Path | Contents |
| --- | --- |
| `src/` | The app. `main.ts` is the page's entry point, `land.ts` describes a sample land |
| `public/` | What the browser is served: `index.html` and the sample lands |
| `public/samples/` | The sample lands, one JSON file each, plus `index.json` |
| `public/sample-inputs/` | For each sample land, the files a person would bring to the app |
| `scripts/` | `make-samples.ts` writes the sample lands, `make-sample-inputs.ts` writes their input files |
| `test/` | Tests |

## Sample lands

All six are made up. None is a real place, and no real owner, address or
location is involved.

| File | Size | Ground |
| --- | --- | --- |
| `meadow.json` | 2 acres | Almost flat rectangle |
| `hillside.json` | 10 acres | Four sides, one hill, a stream on the east side |
| `riverbend.json` | 25 acres | Seven sides, low ground, a river through it |
| `ridge.json` | 5 acres | L-shaped, steep slope climbing to the north |
| `switchback.json` | 1.73 acres | Six sides on a slope, a winding unpaved track that forks, one levelled patch, a public road beside it |
| `terrace.json` | 2 acres | Four sides on the same climb as Switchback, cut into level steps |

Each file holds:

- `boundary`: the corners in metres, counter-clockwise. `x` grows to the east
  and `y` to the north.
- `areaSquareMetres` and `acres`: the area inside the boundary.
- `elevation`: ground heights in metres on a regular grid, row by row from the
  south, each row from west to east.
- `water`: streams and rivers as centre lines with a width.
- `tracks`: ways that are already there, as centre lines with a width. A
  `track` is unpaved and inside the land; a `road` is a public road beside it.
- `pads`: patches of ground that are already levelled.

`src/land.ts` has the full description. The format is only a starting point and
can change as the project needs. The files are generated, so change
`scripts/make-samples.ts` and run `npm run samples` instead of editing them by
hand; a test fails if the two disagree.

## Sample input files

`public/samples/` holds each land already worked out: boundary in metres and
ground heights. `public/sample-inputs/<land>/` holds the same land the way a
person would first bring it to the app:

| File | What it is |
| --- | --- |
| `location.json` | A latitude and longitude for the land |
| `boundary.geojson` | The boundary as longitude and latitude corners, as if walked with a phone |
| `from-above.png` | A picture of the land from straight above, north at the top |

All of it is made up. The locations sit in open sea near 0°N 0°E on purpose, so
no file points at a real property. The pictures are drawn by
`scripts/make-sample-inputs.ts` from the sample land; none is a photograph.
`public/sample-inputs/index.json` lists the files for every land.

There is no file for ground heights among the inputs. With internet they would
be looked up from the location; here they are in `public/samples/<land>.json`.

## Licence

Apache-2.0. See [LICENSE](LICENSE).
