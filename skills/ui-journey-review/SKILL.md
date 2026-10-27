---
name: ui-journey-review
description: Present implemented UI as an interactive user flow for human review, connecting real screenshots with actions, decisions, errors, and recovery paths. Use when asked to show what was built, map a product journey, or review a feature across screen states.
---

# UI Journey Review

Make the experience reviewable: what does the user see, what can they do, and what happens next? Deliver one navigable canvas of actual captures, with a small evidence index that makes the limits clear.

## Establish the scope

Identify the task, entry point, platform, source revision, and relevant user conditions. Read the project's instructions and existing flow/state owners. Respect an explicit request for text, a different presentation, or read-only analysis. Mapping a flow does not authorize changing the product, creating accounts, sending messages, purchasing, or publishing its captures.

Trace conditions and outcomes to accessible source or observed behavior. Distinguish observed behavior, source-confirmed behavior, requirements, and unverified assumptions. A hypothetical flow must be labeled as such; it is not implementation evidence.

Compare affected states with the product's equivalent surfaces. Reuse its components, tokens, and platform conventions when recommending changes. Do not impose this viewer's visual style on the product.

## Map actions to outcomes

Start with the shortest complete path from entry to result. Add branches only where behavior actually differs: account state, permission, empty data, loading, error, cancellation, or retry. Every represented action needs a destination or an explicit unverified outcome.

Keep the main path visible together. Optional secondary actions can expand from their originating screen. Do not replace the journey with a gallery, a page selector, or a list of implementation notes. A small task can be a two-screen flow.

Read [references/capture-and-review.md](references/capture-and-review.md) for evidence handling and review checks. If this task also changes UI, capture the real baseline before editing and repeat matching scenarios afterward. Keep implementation/delivery status separate from evidence completeness.

## Capture the actual experience

Use the real application, native simulator, or an existing fixture that renders the actual product components. Follow the user's chosen browser/simulator tooling. Do not redraw screens, generate artwork, invert light images for dark mode, or reuse an unrelated state as evidence.

Capture actions and results, including relevant feedback, retained input, failure, and recovery. Screenshots establish appearance; use recordings for timing, motion, and sequences that still images cannot establish. Label fixtures and historical captures precisely.

The bundled renderer requires a real light/dark pair for every screen. When a theme is unsupported or unavailable, report that limit. Use the evidence index or an explicitly schematic outline until the required captures exist; do not fabricate the second theme or claim the outline verifies the UI.

## Build the canvas

Use the bundled renderer rather than rewriting a viewer per journey. It needs Python 3.10+ and a modern browser, with no third-party Python or JavaScript packages. Treat journey data as trusted local input, not as a public upload service.

Read [references/journey-format.md](references/journey-format.md) when authoring JSON. `scripts/build.py:validate` is the executable contract. Keep business conditions, captions, and routes in journey JSON; `journey.js` and `journey.css` own presentation.

Resolve `SKILL_DIR` to this skill's installed directory, and place the journey and export in a task-owned review folder:

```sh
python3 "$SKILL_DIR/scripts/build.py" /path/to/review/journey.json \
  --output /path/to/review/site
python3 -m http.server 43192 --bind localhost --directory /path/to/review/site
```

Use an available local port and preserve existing servers. Export outside `scripts/` into a dedicated directory: the builder overwrites its generated entry, runtime, manifest, and referenced assets. It does not remove stale files. Use a fresh export for public sharing and inspect everything in it.

Keep viewer titles, actions, conditions, and accessibility labels concise and in the requested language; English is the public-package default. Capture the product in its actual requested locale. Explain provenance and limitations in the index, not on every canvas node.

Route connectors through nearby whitespace without crossing screenshots or labels. Only explicit failures or refusals use error-colored edges. A normal “No,” successful retry, or idempotent success stays neutral. Paths with different destinations must not overlap so closely that they look merged.

## Inspect and deliver

Open the generated site and follow each represented path. Inspect every actual capture at readable size. Exercise pan, zoom, fit, theme switching, screenshot enlargement, optional branches, close/focus return, and relevant narrow layouts. Fix authored routing and missing assets; report product defects within the requested scope.

Keep one `REVIEW.md` beside original captures, recordings, journey JSON, and the generated manifest. Embed key screenshots in it; for changed UI, embed matching before/after pairs. Record revision, device/viewport, theme, locale, fixture status, what was exercised, and remaining gaps. A successful export validates structure and checksums, not product correctness or full journey coverage.

Deliver the runnable entry and review-index link with a concise statement of verified coverage and limitations. A gap note does not complete missing visual evidence: attempt the permitted preview/fixture recovery and report an exact blocker if it remains. Do not add a new commit or merge approval gate.

Before any authorized public sharing, inspect pixels, text, metadata, URLs, file names, and the complete export for secrets or private content. Preserve originals privately and label any redacted derivatives. Publishing a review requires separate authorization from reviewing it.
