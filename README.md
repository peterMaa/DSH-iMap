# dsh-imap

A WebGIS plugin for **DeepSeek Harness (DSH)** that puts a working map inside the
conversation: the model loads data, reads the map, and runs spatial analysis through
dialogue. This repository is a fork of [`dsh-webgis`](https://github.com/Mekansm1/DSH-WebGIS)
by **Frank Wang**, aimed at one-tap mapping — fewer round trips between "I have data"
and "it is on the map".

- Every tool result becomes a live layer the next tool can keep processing.
- Large files and database results stay responsive: count first, render in tiers,
  materialize on demand.
- Basemaps are readable too: rivers, roads, buildings, place names and POIs can be
  extracted from the vector basemap into normal analysable layers.

## Compatibility

| Item | Requirement |
| --- | --- |
| DSH | `0.2.2` line — built and verified against `0.2.2-rc.5` |
| Node.js | `>= 24.9.0` |
| DSH surface | Web profile (`webServer` service) |
| DuckDB runtime | `@duckdb/node-api` with its prebuilt platform binding (no compile step) |

The plugin identifier is `dsh-imap` everywhere: package name, the loader row in
`cordis.patch.yml`, the browser module id, and the map surface registration.

## Install

This fork is not published to npm; it is installed from a local checkout.

```bash
git clone https://github.com/peterMaa/DSH-iMap.git
cd DSH-iMap
npm install
npm run build
```

Then, in DSH:

1. **Plugins** → **Add plugin** → pick the checkout directory above (the folder
   containing `package.json` and `lib/`).
2. Restart DSH, or open a new session, so the new plugin generation is loaded.
3. Start a conversation and switch to **GIS mode** from the session header.

The profile links the checkout instead of copying it: **do not delete or move the
folder** afterwards. To update, `git pull && npm install && npm run build`, then
restart.

> Building against a different DSH release: align the `@deepseek-ai/dsh-*` entries in
> `devDependencies` with that release before `npm install`, and keep the
> `peerDependencies` range (`^0.2.2-rc.1`) wide enough for the patch-level upgrades.

## Quick start

1. Open DeepSeek Harness and start a conversation.
2. Switch to GIS mode.
3. Choose the task workspace.
4. Ask, for example: *"Load `xxx.geojson` and show it on the map."*

## Highlights

- 🗺️ **Conversational GIS** — load data, navigate, analyse and style by asking.
- 🚀 **Large data** — million-row CSVs and six-figure database results stay smooth.
- 🧮 **Analysis toolbox** — buffer, overlay, kernel density, Moran's I and LISA,
  Gini, Shannon entropy, Getis-Ord Gi\*, average nearest neighbour, OD matrices,
  hex-bin and planar heatmaps.
- 🛰️ **Basemap as data** — extract current-view waterways, roads, buildings and POIs
  into layers you can measure and analyse.
- 🖌️ **Manual workflows** — draw points / lines / polygons, reorder layers, import
  and export SHP / CSV / GeoJSON.
- 🔌 **Multiple sources** — local files, PostGIS, the basemap itself, and online
  WMTS / WMS / XYZ services.

## Features

### Compute — analysis by dialogue

Ask *"show this as a hex heatmap"* or *"which points fall inside this polygon?"* and
the model chains the appropriate tools:

- **Construct** — buffer, centroid, convex hull, bounding box, dissolve, simplify,
  explode, smooth, regular grid, Voronoi, OD matrix.
- **Overlay** — clip, intersect, difference, union.
- **Query** — attribute filter, spatial join, select by location.
- **Transform** — WGS84 ↔ Web Mercator reprojection.
- **Spatial statistics** — kernel density, ANN, global Moran's I, local LISA, Gini,
  Shannon entropy, Getis-Ord Gi\* hotspots.
- **Visualization** — points, planar heatmap, hex bins, arcs, trips, walls, radial;
  colors, sizes and stroke widths adjustable.
- **Thematic colouring** — natural breaks, quantiles, equal intervals, user-defined
  ranges, or one colour per category; surplus categories ask before colouring.
- **Attribute editing** — set values in bulk, add columns, assign sequence numbers.
- **Layer management** — list, hide, delete, reorder (drag, or move via dialogue).

Indices ask before computing: a statistics request first reports candidate fields,
missing values and the geometry family, then waits for confirmation instead of
picking a field on its own.

### Read the basemap

Vector basemaps carry real feature data. Extracting features from the current view
turns what you see into layers:

> - "Export the map data in the current view" → three layers: points / lines / polygons
> - "Export the rivers in this view" → one layer, same-named segments merged

Extracted layers behave like imported data. This is a viewport extraction, not bulk
export: vector tiles are cut by zoom level, so POIs and buildings generally appear
only at city zoom. For bulk data use Geofabrik or Overpass and import a file.

### Draw and manage

- The classic / GIS mode switch lives in the session header; the choice is per session.
- The layer panel lists datasets, analysis results, database results and imports with
  show/hide, delete, and drag-to-reorder (top of the list = top of the map).
- The Create button opens a drawing toolbar: points, lines, polygons, Bézier
  smoothing, and snapping to existing vertices.
- Right-click a layer to inspect attributes, export GeoJSON / CSV / SHP, or delete it.
- Import SHP (`.shp` / `.zip`), CSV or GeoJSON; CSV detects a WKT geometry column and
  otherwise falls back to longitude / latitude columns.

### Maps and data services

- Basemap switcher: Carto Light / Dark / Voyager, OpenFreeMap, satellite imagery.
- Online overlays: WMTS / WMS / XYZ raster services, with `{bbox-epsg-3857}`
  templating for WMS.
- Source routing: prefer layers already on screen and query the database only when
  needed — the model does not invent data.

## Massive data loading

The rule is *count first, render in tiers, materialize on demand* — never push
everything to the browser at once.

- **Local CSV (DuckDB)** — loaded once into an in-memory table, then filtered at
  millisecond speed; large files start as a sampled, clustered view while the full
  table stays available for SQL, attribute and polygon-fence filtering. Coordinates
  are read in columnar chunks to build geometry directly, avoiding million-scale
  JavaScript row objects. LRU eviction plus a memory limit guard the host.
- **PostGIS** — read-only queries, `count` first to decide whether and how to load,
  automatic `ST_Transform` to 4326, statement timeout and read-only transactions.
- **Sampling is visible** — a layer showing a sample says so, and statistics derived
  from it are flagged. A sample is never presented as the full dataset.
- **Rendering** — deck.gl GPU paths (hex columns, wall extrusions, OD arcs) keep
  hundreds of thousands of rows smooth to zoom, filter and analyse.

## Configuration

Settings → Plugins → the **dsh-imap** tab, or the plugin row config in
`cordis.patch.yml`:

| Key | Purpose |
| --- | --- |
| `baseTileUrl` | Default raster basemap tiles |
| `tiandituKey` | Tianditu key for 天地图矢量 (vector basemap + annotations) |
| `vision.provider` / `vision.model` | Vision model used to read map screenshots when the conversation model is text-only |
| `defaultDataset` | Optional dataset loaded at startup |
| PostGIS host / port / database / user / password | Database connection for the SQL tools |
| DuckDB thresholds and memory limit | Sampling and memory behavior for large layers |

Passwords are handed to DSH's credential store rather than written to disk in
plaintext.

### Locate points from a map screenshot

1. `webgis_get_pick` with `refresh: true, describe: false` captures the view and
   returns a screenshot id.
2. `webgis_locate_map_points` asks the vision model for 0–1 normalized positions in
   that image, then converts them to WGS84 using the viewport saved with the capture.
3. `webgis_create_point` adds the converted points as one new layer, keeping the
   screenshot id, normalized coordinates and `vision-estimate` source as attributes.

Coordinates are visual estimates; if the model cannot find the target it returns an
empty list rather than a guess.

### Create features from coordinates

`webgis_create_point`, `webgis_create_line` and `webgis_create_polygon` accept WGS84
`[longitude, latitude]`. Polygons close their outer ring automatically and reject
self-intersections and zero-area rings. Use `points` for several points in one layer.

### Example prompts

> - "Load this `xxx.shp` onto the map."
> - "Are these points clustered? Show them as a hex heatmap."
> - "Filter the points that fall inside `region B`."
> - "Export the map data in the current view."
> - "Is the population of these counties clustered or random?" (runs Moran's I)
> - "Capture the current map, find three visible landmarks and add them to a layer."

## What this fork changes

Relative to `dsh-webgis` 0.2.2:

- **One identifier, `dsh-imap`** — package name, loader row, browser module id, lazy
  chunk ids and map surface id all agree, so the plugin can be installed from source
  as a single unit.
- **Harness baseline** — `devDependencies` pinned to the DSH release the plugin is
  built against (`0.2.2-rc.5` at the time of writing), with the peer range left at
  `^0.2.2-rc.1` so patch-level harness upgrades do not break activation.
- This README, rewritten for the fork: it no longer instructs an npm install of
  `dsh-webgis` (published as [`dsh-webgis`](https://www.npmjs.com/package/dsh-webgis)
  upstream).

The upstream feature history (0.1.1 → 0.2.2) is unchanged by the fork; see the
[upstream project](https://github.com/Mekansm1/DSH-WebGIS) for the origin.

## Origin and credit

Upstream plugin: **dsh-webgis** by **Frank Wang** (`cywanghn@gmail.com`), which this
fork builds on in full. The fork keeps the upstream MIT license and the original
author credit; the changes above are the fork's own.

## Development

```bash
npm install
npm run typecheck   # host + client type check
npm run build       # tsc, client bundles (tsdown), asset copy
npm test            # build, then the test suite
```

`lib/` and generated files under `assets/` are build output; the client bundles are
registered through DSH's module loader, so a rebuild plus a restart (or page reload)
is what picks up front-end changes.

## Roadmap

- Phase 1 (in progress): 2D map-vision understanding — what is where, and where is this.
- Phase 2 (in progress): conversational operation and analysis, closing the
  load → analyse → visualise loop.
- Phase 3 (long term): genuine 3D-world understanding — buildings, terrain, occlusion
  and spatial relations, not just a description of a picture.

> The 3D visuals available today (hex columns, wall extrusions, OD arcs) are the
> starting point, not the goal.

## License

MIT — see [LICENSE](LICENSE).
