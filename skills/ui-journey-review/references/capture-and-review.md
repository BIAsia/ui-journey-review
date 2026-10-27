# Capture and review

## Evidence unit

For each meaningful state, record the trigger, entry conditions, resulting state, source revision, and capture environment. Keep observed results separate from expectations. A source read can confirm a branch exists; it cannot establish its rendered appearance or timing.

Prefer realistic, sanitized fixture data when live data is unnecessary. Fixtures can establish presentation and local behavior; they do not prove account signup, email delivery, billing, persistence, cross-device recovery, or deployment.

For changed UI, keep matching baseline/result captures under the same task folder. Match the account or fixture, viewport/device, theme, locale, and state. For a new page, the baseline is the previous entry and what its action actually reached. If no comparable state existed, say so. Never substitute a generic login screen for an inaccessible downstream page.

Retain original images and recordings. Mark later corrections and superseded captures instead of overwriting them. Record the exact blocker and missing states when capture fails; attempt an authorized preview or real-component fixture before declaring the evidence blocked.

## Review lenses

Record `checked`, `mismatch`, `unverified`, or `not applicable` for relevant lenses, with a concrete peer or reason:

| Lens | What to compare |
| --- | --- |
| Entry | Trigger, immediate selection/pressed feedback, presentation, dismissal, and return |
| Loading | Initial, refresh, and partial loading; shared skeleton; layout shift; usable controls |
| Empty | No data, no results, permission, completion, and error as distinct states |
| Actions | Role, hierarchy, state, shared component, and keyboard behavior |
| Titled scrolling | Content under a fixed header, long titles, top/middle/end |
| Icons and color | Semantic inheritance, disabled/destructive meaning, theme and platform conventions |

Also inspect task-specific accessibility, layout, motion, and successful completion. A single screenshot or code search is not a cross-surface comparison.

When filters, sort, pagination, or view switching are part of the path, check immediate control feedback while only the affected content loads. Include delayed requests, rapid changes, empty results, and retry where relevant. Select the cursor for the hovered region's primary operation: editing, clicking, or dedicated dragging/panning.

Trace a mismatch to its shared owner and same-role consumers. Report the observation, comparable surface, expectation, verified cause or evidence gap, proposed fix, and verification. Do not expand a read-only review into implementation.

## One evidence index

Use the task's existing `REVIEW.md`. A compact record can contain:

- Scope, source revisions, environment, and runnable viewer link.
- Target → equivalent product surface → reused owner → justified difference.
- Per-state evidence with directly embedded images, and before/after pairs for changes.
- Recordings for affected timing or motion, with the scenario and capture conditions.
- The six-lens coverage table, findings, and concrete remaining limits.
- Implementation/integration status separately from evidence completion.

Use relative media paths in portable packages and absolute paths when the local viewer requires them. Confirm that embedded files exist and render. Keep sensitive originals outside a public export.

## Viewer acceptance

Inspect a representative wide and narrow viewport in both themes. Open each screenshot at full size. Follow the main path and every optional branch, including failure and recovery. Check labels, endpoints, crossings, focus entry/return, Escape dismissal, zoom/reset/fit, and theme synchronization inside an open image dialog.

Separate rendering checks from actual product checks. Missing images, historical screenshots, a structurally valid graph, or a successful build are never proof of a complete current product journey.
