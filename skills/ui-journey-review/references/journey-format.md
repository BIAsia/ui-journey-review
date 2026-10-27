# Journey format

The builder's `validate` function is the authoritative executable contract. This guide explains authoring; it is not a second schema implementation.

## Root and graph

Use `schemaVersion: 2`, nonempty `id` and `title`, optional `subtitle`, a `screens` object, and a `graph` with positive `width`/`height`, nonempty `nodes`, and `edges`.

Nodes have a unique CSS-safe `id` (start with a letter; then letters, digits, `_`, or `-`), `kind` (`screen`, `decision`, or `text`), `title`, nonnegative `x`/`y`, optional positive `width`, and optional `state`. A screen node also references a key in `screens` via `screen`.

Edges have `from`, `to`, and at least two `[x, y]` route points. Optional `label` requires `labelAt: [x, y]`. `tone` is `neutral` by default or `error` for an explicit failure/refusal. Coordinates are authored in canvas units; connectors do not automatically route around nodes.

The runnable [flow outline](../assets/examples/flow-outline/journey.json) intentionally has `screens: {}`. It demonstrates graph structure only and does not claim product verification.

## Screens and provenance

Each screen uses a `title` and exactly two `variants`: `light` and `dark`. Optional `historical: true` and `versionLabel` identify old captures. Each variant has:

| Field | Meaning |
| --- | --- |
| `src` | Local relative path beginning with `assets/`; PNG, JPEG, or WebP |
| `width`, `height` | Original image dimensions, before viewer scaling |
| `sha256` | SHA-256 of the actual file bytes |
| `provenance.sourceRevision` | Actual captured source/build identifier |
| `provenance.device` | Device or browser viewport description |
| `provenance.runtime` | Browser, simulator, or app runtime version |
| `provenance.locale` | Actual product locale |
| `provenance.captureDate` | Actual capture date, preferably with time zone |
| `provenance.fixture` | Boolean: whether this is fixture evidence |
| `provenance.theme` | Exactly the containing variant's theme |

External URLs, absolute image paths, traversal, missing assets, and checksum mismatches are rejected. The builder does not inspect pixels, verify image dimensions, authenticate provenance, or judge whether a screenshot actually depicts the declared state. Check these before export. Do not put private absolute paths or account identifiers into public provenance.

See the bundled [viewer walkthrough](../assets/examples/viewer-walkthrough/journey.json) for a complete screen-based example using real browser captures of this viewer itself.

## Optional branches

Each `branches[]` entry has a unique `id`, `from` referencing a main-graph **screen** node, nonempty `title` and `action`, `bounds: {x, y, width, height}`, nonempty `nodes`, and `edges`.

Branch nodes use global canvas coordinates. Branch edges can reference their own nodes or main nodes, but cannot depend on another collapsed branch. Main edges cannot refer to hidden branch nodes. An optional `hotspot: [x, y, width, height]` uses percentages within the source screenshot, stays within 0–100, and corresponds to a real action region; omit it when no such region exists.

`nodeAliases` optionally maps old links or short names to actual node IDs. `?node=ID` locates a node and expands its containing branch when needed.

## Output and limits

Export includes `index.html`, `journey-data.js`, `journey.js`, `journey.css`, referenced images, and `build-manifest.json`. The manifest records input/runtime hashes and the number of distinct copied asset paths. Serve the entire directory together. No backend, analytics, CDN assets, or dependency installation is required.

Use only trusted, locally authored JSON and dedicated output folders without symlinks. This CLI is not a hardened service for untrusted uploads. Files already in an output folder are not pruned; create a fresh directory before publishing so older assets cannot leak into a new review.
