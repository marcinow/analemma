# Issues — Interactive Analemma

Work is sliced as **tracer bullets**: each issue is an independently-grabbable **vertical slice** that keeps `index.html` openable and working end-to-end after it lands. Earlier slices build the skeleton; later slices thicken it. Pick any issue whose dependencies are `Done`.

## Status legend

| Status | Meaning |
|--------|---------|
| 📋 Todo | Not started |
| 🚧 In Progress | Being worked on |
| 🔍 Review | Implemented, awaiting verification |
| ✅ Done | Verified against acceptance criteria |
| ⛔ Blocked | Waiting on a dependency or decision |

## Progress

| # | Issue | Status | Depends on |
|---|-------|--------|------------|
| 1 | Walking skeleton: static analemma | ✅ Done | — |
| 2 | Hover/tap a point → date | ✅ Done | 1 |
| 3 | Rich per-day info panel | ✅ Done | 2 |
| 4 | Time-of-day slider | ✅ Done | 1 |
| 5 | Location: bundled cities + manual lat/long | ✅ Done | 1 |
| 6 | Location: live geocoding search | ✅ Done | 5 |
| 7 | EoT × Declination projection toggle | ✅ Done | 1 |
| 8 | Markers + "today" | ✅ Done | 1 |
| 8a | Fold/unfold Location & Time control lines | ✅ Done | 4, 5 |
| 9 | Golden-hour / twilight bands layer | 📋 Todo | 1 |
| 10 | Theme toggle (dark default) | 📋 Todo | 1 |
| 11 | Language toggle (EN/PL) | ✅ Done | 3 |
| 12 | Shareable URL state | 📋 Todo | 4, 5, 7, 10 |
| 13 | Polish: touch, a11y, polar, attribution | 📋 Todo | 3 |

---

## Issue 1 — Walking skeleton: static analemma

**Status:** ✅ Done · **Depends on:** — · **PRD:** FR‑1, FR‑3 (noon only), §5, §7

The tracer bullet: a single self-contained `index.html` that opens via `file://` and draws a correct figure‑8.

- Vendor **SunCalc** inline; add the tiny page scaffold (header, SVG canvas, footer).
- Compute one Sun position per day for a **hardcoded location** (e.g. Warsaw) at **local mean solar noon** using the `UTC_hours = h − lon/15` time model.
- Render the points as an SVG path in the **sky view** (azimuth × altitude) with horizon line and labeled axes, in a responsive `viewBox`.

**Done when:** opening the file in a browser (no server, offline) shows a recognizable analemma; solstice points sit at the declination extremes and the curve is near-symmetric at noon.

### Delivered

- **SunCalc vendored inline** — fully offline, no external dependencies
- **365 daily Sun positions** for Warsaw 2026, sampled at LMST 12:00 using `UTC = 12 − lon/15`
- **Sky view** (azimuth × altitude) rendered as a closed SVG path forming the figure-8
- Horizon line, altitude grid (every 10°), azimuth grid with `← East  S  West →` orientation labels
- **"Today" dot** highlighted in amber with a label
- Responsive `viewBox`; opens via `file://` with zero network required

### Verify

- Top of the 8 ≈ **61° altitude** (summer solstice, Sun high); bottom ≈ **14°** (winter solstice)
- Left-right sway ≈ **±4°** — the equation of time signature
- Curve is near-symmetric about the south meridian line at noon
- Today's dot is correctly placed for the current date

## Issue 2 — Hover/tap a point → date

**Status:** ✅ Done · **Depends on:** 1 · **PRD:** FR‑5 (date only), FR‑17

- On `pointermove`/`pointerdown`, find the nearest daily sample within a pixel threshold; highlight it.
- Show a minimal info panel with the **localized date**; tap pins it on touch.

**Done when:** moving along the curve updates the highlighted point and shows the correct date; tap works on touch.

### Delivered

- **Hover** moves an amber ring along the nearest daily sample; tooltip shows the full date (e.g. "June 9")
- **Click/tap pins** the tooltip (amber border on the panel, ring stays); clicking the same point unpins, clicking elsewhere moves the pin
- **Touch** works the same way — `pointerdown` + `preventDefault()` prevents scroll interference
- Coordinate math uses `getScreenCTM().inverse()` so it's correct regardless of how the SVG is scaled by CSS
- Threshold is 28 SVG units (~28px at 1:1 scale) — wide enough to be comfortable, tight enough not to snap from far away

### Verify

1. Hovering anywhere near the curve shows a date and highlights the nearest point with an amber ring
2. Clicking pins it (tooltip gets an amber border); clicking the same point unpins
3. Works on touch — no page scroll when tapping on the chart

## Issue 3 — Rich per-day info panel

**Status:** ✅ Done · **Depends on:** 2 · **PRD:** FR‑5, FR‑6

- Extend the panel with **sun altitude/azimuth, day length, night length, sunrise, sunset** (`SunCalc.getTimes`) and **Moon phase** name + icon + illumination % (`getMoonIllumination`).
- Handle **polar day/night** messaging instead of NaN.

**Done when:** every field populates for a hovered date and a spot-checked sunrise/sunset matches a known reference; polar latitudes show friendly messages.

### Delivered

- **Sun altitude & azimuth** shown for each hovered date (azimuth expressed as `°E` / `°W` from south)
- **Sunrise & sunset** times displayed in Local Mean Solar Time (`UTC + lon/15`)
- **Day length & night length** derived from `sunset − sunrise`
- **Moon phase** name, Unicode icon (🌑–🌘), and illumination % via `getMoonIllumination`
- **Polar day/night** handled: "Sun up all day" / "Sun never rises" + corrected 24h/0h durations shown instead of NaN when SunCalc returns invalid dates
- **Info panel layout** redesigned with a date heading, two-column key/value rows, and a separator before the moon line
- Fixed pre-existing **`display: none` regression** from Issue 2: `info.style.display` was being reset to `''` (reverting to CSS `none`) instead of `'block'`

## Issue 4 — Time-of-day slider

**Status:** ✅ Done · **Depends on:** 1 · **PRD:** FR‑3

- Add a **00:00–24:00 slider** (default 12:00) with a live readout that re-samples the curve at the chosen local mean solar time.

**Done when:** dragging the slider visibly reshapes/tilts the figure‑8 in real time.

### Delivered

- **Time (LMST) slider** in a controls bar between header and SVG; range 00:00–24:00 in 1-minute steps, default 12:00
- **Live readout** (`HH:MM`) updates as the thumb moves; header subtitle also reflects the current time
- **Full re-render on input**: `buildPoints()` is called with the new `lmstHour`, so the curve, dots, axes, and "today" marker all update instantly
- **Pinned tooltip reset** on slider change so a stale panel from a previous time doesn't linger
- Verified: at 12:00 the classic symmetric figure-8 near south; at 06:00 the curve tilts sharply east and sits near the horizon — correct astronomical behaviour

## Issue 5 — Location: bundled cities + manual lat/long

**Status:** ✅ Done · **Depends on:** 1 · **PRD:** FR‑7, FR‑9, FR‑10

- Inline a **~150-city list**; add an autocomplete selector and **manual lat/long inputs** that re-render the curve.
- Optional **"use my location"** via the Geolocation API.

**Done when:** picking a city or entering coordinates updates the analemma; works fully offline.

### Delivered

- **Location controls bar** added above the time slider with city search, lat/lon inputs, and geolocation button
- **City autocomplete** — type to filter the bundled list; keyboard navigation (↑/↓/Enter/Esc); click/tap to select; dropdown shows up to 8 matches
- **Lat / Lon number inputs** — edit directly and press Enter or blur to re-render; accepts any valid coordinates; shows cardinal-direction name (e.g. `48.85°N, 2.35°E`) when no city match
- **📍 geolocation button** — calls `navigator.geolocation`; shows ⌛ while waiting; hidden when the API is absent
- **City → coords sync**: selecting a city fills the lat/lon inputs; editing coords tries to reverse-match a bundled city name
- **Bundled city list**: 152 cities across all continents and timezones, including polar extremes (Longyearbyen 78°N, Ushuaia 55°S) for testing polar day/night; fully offline — no network needed

## Issue 6 — Location: live geocoding search

**Status:** ✅ Done · **Depends on:** 5 · **PRD:** FR‑8

- When a search isn't in the bundled list, query the **Open‑Meteo Geocoding API** (no key) and resolve coordinates; **degrade gracefully offline** with a notice.

**Done when:** an arbitrary city resolves when online; offline falls back to bundled list + manual entry without errors.

### Delivered

- **Debounced live search**: 400 ms after the user stops typing, fires a request to `https://geocoding-api.open-meteo.com/v1/search` (no API key, CORS-enabled); a 5 s `AbortController` timeout prevents hanging
- **Incremental dropdown**: bundled matches appear instantly; live-only results are appended below a `🌐 online results` separator once the response arrives — no flicker or replacement of already-visible results
- **Deduplication**: results already present in the bundled list are filtered out before appending
- **Graceful offline degradation**: if the fetch fails or times out and the bundled list is also empty, the dropdown shows `⚠ offline — bundled cities only`; if bundled results exist, the failure is silent
- **Stale-query guard**: in-flight responses whose query no longer matches the current input are discarded

## Issue 7 — EoT × Declination projection toggle

**Status:** ✅ Done · **Depends on:** 1 · **PRD:** FR‑2, §5

- Add the **NOAA helper** (equation of time + declination); add a **view toggle** that re-projects the same per-day data to EoT (x) × Declination (y) with its own axes.

**Done when:** toggling switches projection cleanly; the EoT shape is the expected location-independent figure‑8.

### Delivered

- **NOAA EoT + Declination helper** (`solarEoTDecl`): hand-written using NOAA's Julian-century formulas for geometric mean longitude/anomaly, eccentricity, obliquity, equation of center, and the y-formula for equation of time; stamped onto every point in `buildPoints`
- **Sky | EoT toggle** in the controls bar — two segmented buttons, Sky active by default
- **EoT × Declination view**: x-axis = equation of time (minutes, gridded every 4 min, labelled `← fast … slow →`), y-axis = declination (degrees, gridded every 5°, equator labelled); no sky gradient or horizon in this view
- **Location-independence verified**: the EoT × Decl figure-8 shape does not change when switching cities (correct — it depends only on date)
- **Subtitle** updates to `… · EoT × Decl` when toggled
- **Info panel** shows Eq. of Time + Declination instead of Altitude + Azimuth in EoT view; polar-day/night messaging is suppressed (irrelevant in EoT view)
- **State preserved across toggles**: pinned tooltip cleared on switch; time slider and location carry over

## Issue 8 — Markers + "today"

**Status:** ✅ Done · **Depends on:** 1 · **PRD:** FR‑11, FR‑12

- Draw and label **solstices, equinoxes, and 1st-of-month ticks**; highlight the **current date** with a distinct marker. Works in both projections.
- Solstice/equinox + month ticks are **togglable** via a **Markers** button (off by default); the **"today" marker is always visible** regardless of the toggle.

**Done when:** markers appear at the correct dates/positions in both views; "today" is visible; toggling Markers hides month/solstice markers but not today.

### Delivered

- **Month start ticks**: all 12 months get a small outlined circle + 3-letter label (`Jan`–`Dec`), positioned radially outward from the curve center so labels don't overlap the path
- **Solstice markers**: June solstice in amber (`#f5a623`), December solstice in light blue (`#93c5fd`); each labeled with the exact computed date (e.g. `Jun 21`)
- **Equinox markers**: March and September equinoxes in teal (`#5eead4`), labeled with the date; correctly placed near the equator line in EoT × Decl view
- **Markers toggle**: a **Markers** button in the controls bar (off by default) shows/hides month ticks and solstice/equinox markers; re-renders without those layers when off
- **Today marker**: amber glow ring + filled dot + `Today` label; **always visible**, independent of the Markers toggle; replaces the old ad-hoc dot from Issue 1
- **Both views**: `drawMarkers()` is called after every re-render so markers appear correctly in both Sky and EoT × Declination projections
- **`test/issue8-markers.mjs`**: 24 Playwright tests covering all marker types, label presence, solstice vertical ordering, equinox proximity to the equator line, Markers toggle (hides month/solstice but keeps today), and view-toggle persistence

## Issue 8a — Fold/unfold Location & Time control lines

**Status:** 📋 Todo · **Depends on:** 4, 5 · **PRD:** FR‑18, §6

The controls bar is getting crowded. Make the **Location** and **Time** control lines individually **collapsible**, each behind a clickable header/disclosure toggle, **folded by default** so the page opens with a compact control area and the analemma front-and-center.

- Wrap the location line (city search + lat/lon + geolocation) and the time line (LMST slider + readout) each in a foldable group with a labeled header (e.g. `▸ Location` / `▾ Location`).
- **Folded by default**; clicking the header expands/collapses that group. State is per-group and independent.
- Keep the controls keyboard-operable (header is a real button, `aria-expanded`) and the layout responsive (≥320 px).
- A folded group should still show enough to orient the user — e.g. the header reflects the current value (current city name / current LMST) so the page is informative without expanding.

**Done when:** opening the page shows both Location and Time folded; clicking either header reveals its controls; collapsing hides them again; the analemma still renders and other controls (view toggle, Markers) are unaffected.

### Delivered

- **`#ctrl-bar`** — always-visible bar containing the two fold toggles plus the Sky/EoT view toggle and Markers button; replaces the old `#loc-controls` and `#controls` divs
- **Location toggle** (`#locToggle`) and **Time toggle** (`#timeToggle`) — `<button>` elements with `aria-expanded` and `aria-controls`; clicking flips the panel open/closed and rotates the `▸` chevron 90° via CSS transition
- **`#loc-panel`** and **`#time-panel`** — collapsible panels (`display:none` / `.open` → `display:flex`); Location holds city search + lat/lon + geolocation, Time holds the LMST slider + readout
- **Summary labels** — `#locSummary` (city name) and `#timeSummary` (HH:MM) are always visible in the bar and stay in sync: `triggerRender` updates `locSummary` on every location change; the slider's `input` handler updates `timeSummary` alongside the existing `timeReadout`
- **`test/issue8a-fold-controls.mjs`**: 38 Playwright tests covering initial fold state, `aria-expanded` attributes, computed visibility, open/close toggling, simultaneous open, independent toggling, summary text updates (city select + slider move), always-visible controls, chart rendering, and zero JS errors

## Issue 9 — Golden-hour / twilight bands layer

**Status:** 📋 Todo · **Depends on:** 1 · **PRD:** FR‑13

- Add a **selectable, off-by-default** layer of shaded altitude bands (golden hour 0°–6°; civil/nautical/astronomical twilight) in the sky view.

**Done when:** the toggle shows/hides correctly positioned bands; off by default.

## Issue 10 — Theme toggle (dark default)

**Status:** 📋 Todo · **Depends on:** 1 · **PRD:** FR‑15, §7

- Theme via **CSS custom properties**; **dark/light toggle, dark default**, persisted in `localStorage`.

**Done when:** toggling restyles the whole page with good contrast in both themes and persists across reloads.

## Issue 11 — Language toggle (EN/PL)

**Status:** ✅ Done · **Depends on:** 3 · **PRD:** FR‑14

- Add an **EN/PL string dictionary** and toggle; localize UI labels, month names, Moon-phase names, and date/number formatting via `Intl`.

**Done when:** switching language updates all visible text and formats; no untranslated strings.

### Delivered

- **`STRINGS` dictionary** — two-locale (`en`/`pl`) object covering all UI keys: control labels (`ctrl.location`, `ctrl.time`, `ctrl.sky`, `ctrl.eot`, `ctrl.markers`), location labels (`loc.lat`, `loc.lon`, `loc.placeholder`), time slider label, info-panel keys (`info.altitude`, `info.azimuth`, `info.eot`, `info.decl`, `info.sunrise`, `info.sunset`, `info.daylength`, `info.nightlength`, `info.polarday`, `info.polarnight`), all 8 moon-phase names, axis labels for both views, horizon/equator labels, `marker.today`, 12-month abbreviations, footer text, dropdown status strings, subtitle strings, and the toggle button label itself
- **`t(key)` helper** — single lookup with `en` fallback so untranslated keys never surface as blank
- **`applyLang()` function** — updates `html[lang]`, re-renders all `[data-i18n]` nodes, syncs the city-input placeholder and the `#btnLang` label, clears any pinned tooltip, and triggers a full re-render so the SVG axis labels, month ticks, equator/horizon labels, and "Today" marker all switch language immediately
- **`#btnLang` button** — always visible in the header; shows the *target* language (`PL` when EN is active, `EN` when PL is active); toggles `_lang` and calls `applyLang()` on click
- **Date formatting via `Intl`** — `formatDate()` and the marker date strings use `Intl.DateTimeFormat` / `toLocaleString` with the active locale (`'en'` / `'pl'`), so month names in the info panel and SVG markers follow the locale automatically
- **Moon-phase names** — `moonPhaseInfo()` resolves the phase name through `t(key)` so all 8 names switch language on toggle
- **`test/issue11-language-toggle.mjs`**: 36 Playwright tests covering default EN state, toggle to PL (all `data-i18n` nodes, placeholder, SVG axis labels, month abbreviations, info-panel labels, EoT-view labels), toggle back to EN (labels revert, English months return, Polish months absent), and zero JS errors throughout

## Issue 12 — Shareable URL state

**Status:** 📋 Todo · **Depends on:** 4, 5, 7, 10 · **PRD:** FR‑16

- Serialize `{lat, lon, cityName, year, time, view, lang, theme, layers}` into the **URL hash**; parse and restore on load.

**Done when:** the URL round-trips — opening a copied link in a fresh tab restores the exact view.

## Issue 13 — Polish: touch, a11y, polar, attribution

**Status:** 📋 Todo · **Depends on:** 3 · **PRD:** FR‑6, §7 (a11y), §6 (footer)

- Refine **touch** ergonomics and responsive layout (≥320 px); ensure **keyboard-operable** controls and screen-reader-readable info panel; finalize **footer attribution** (SunCalc, Open‑Meteo) + accuracy caveat.

**Done when:** the page is comfortable on mobile, keyboard-navigable, and shows correct attributions/caveats.
