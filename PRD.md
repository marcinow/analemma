# Product Requirements Document — Interactive Analemma

**Status:** Draft v1
**Date:** 2026-06-09
**Owner:** krzysztof.marcinowicz@gmail.com

---

## 1. Overview

A **standalone web page** that presents an **interactive drawing of an analemma** — the figure‑8 the Sun traces in the sky when observed at the same time of day across a full year. Users explore the curve with mouse or touch; hovering/tapping any point reveals the **date** at that position together with that day's **day/night duration, sunrise & sunset times, and Moon phase**. The analemma is computed correctly for a user‑chosen **geographic location** (selected city, live search, or manual latitude/longitude).

The entire app ships as a **single self‑contained `index.html`** file that works offline (double‑click to open, no server, no build step).

## 2. Goals

- Render an accurate, visually engaging analemma for any location on Earth.
- Make the year explorable: hovering/tapping the curve surfaces rich per‑day astronomical data.
- Let users change location easily (bundled cities, live search, or manual coordinates).
- Keep it fully self‑contained and offline‑capable in one HTML file.
- Be usable and attractive on both desktop (hover) and mobile (touch), in English and Polish, in dark or light themes.

### Non‑goals (v1)

- Navigation‑grade astronomical precision (this is educational/illustrative).
- Historical/future ephemerides beyond a selected calendar year.
- Accounts, persistence beyond the URL/localStorage, or any backend of our own.

## 3. Target users

- General public curious about the Sun's motion and the analemma phenomenon.
- Students and educators (astronomy, geography).
- Astrophotographers planning analemma shots.

## 4. Functional requirements

### 4.1 Analemma visualization

- **FR‑1 (Sky view, default):** Plot the Sun's position as **azimuth (x) × altitude (y)** for the selected location, one point per day across the year, forming the figure‑8. Include a horizon line at altitude 0° and labeled axes.
- **FR‑2 (Projection toggle):** Provide a toggle to switch to the **Equation‑of‑Time (x) × Declination (y)** projection of the same per‑day data (location‑independent shape, scientific view).
- **FR‑3 (Time basis & slider):** The figure‑8 represents a fixed **local mean solar time**, default **12:00 (solar noon)**. An interactive **time‑of‑day slider (00:00–24:00)** reshapes/tilts the curve live, with a readout of the current value.
- **FR‑4 (Year):** A year selector (default current year, 2026); the curve uses 365/366 daily samples.

### 4.2 Interaction & info panel

- **FR‑5 (Hover/tap to inspect):** Moving the pointer over the curve highlights the nearest daily sample. On touch, tapping pins it. An **info panel** displays for the selected date:
  - Date (localized)
  - Sun altitude & azimuth (sky view) or equation of time & declination (EoT view)
  - **Day length** and **night length**
  - **Sunrise** and **sunset** times
  - **Moon phase** name + icon + illumination %
- **FR‑6 (Polar handling):** Where there is no sunrise/sunset (polar day/night), show clear messaging ("Sun up all day" / "Sun never rises") instead of errors.

### 4.3 Location selection

- **FR‑7 (Bundled cities):** An offline list of ~150 major world cities (name, country, lat, lon) selectable via autocomplete; works with no network.
- **FR‑8 (Live search):** When a searched place is not in the bundled list, query the **Open‑Meteo Geocoding API** (no key, CORS‑enabled). Degrade gracefully offline with a notice.
- **FR‑9 (Manual coordinates):** Latitude/longitude inputs that update the curve directly.
- **FR‑10 (Geolocation, optional):** A "use my location" action using the browser Geolocation API.

### 4.4 Markers & layers

- **FR‑11 (Date markers):** Draw and label **solstices, equinoxes, and 1st‑of‑month ticks** on the curve; togglable via a **Markers** button (**off by default**). Works in both Sky and EoT × Declination projections.
- **FR‑12 ("Today"):** Highlight the current date's position with a distinct marker. **Always visible**, independent of the Markers toggle.
- **FR‑13 (Golden‑hour/twilight bands):** Selectable shaded **altitude bands** (golden hour 0°–6°; civil/nautical/astronomical twilight below horizon) in the sky view, **off by default**.

### 4.5 Cross‑cutting

- **FR‑14 (Language):** **English/Polish** toggle; localized UI strings, month names, Moon‑phase names, and date/number formatting via `Intl`.
- **FR‑15 (Theme):** **Dark/light** toggle, **dark by default**; persisted.
- **FR‑16 (Shareable URL):** Encode `{lat, lon, cityName, year, time, view, lang, theme, layers}` in the URL hash; parse and restore on load so a link reopens the exact view.
- **FR‑17 (Touch support):** Full pointer/touch support; responsive SVG that scales to the viewport.
- **FR‑18 (Collapsible controls):** The **Location** and **Time** control lines are each individually **collapsible** behind a labeled disclosure header, **folded by default**, so the page opens compact. A folded header reflects its current value (city name / LMST) for orientation; toggles are keyboard‑operable (`aria-expanded`).

## 5. Astronomy & computation

- **Library:** **SunCalc** (MIT), **vendored inline** for offline use:
  - `getPosition(date, lat, lon)` → altitude/azimuth (sky view).
  - `getTimes(date, lat, lon)` → sunrise, sunset, solar noon, twilight (durations + bands).
  - `getMoonIllumination(date)` → Moon phase + illumination.
- **NOAA helper (hand‑written):** equation of time and solar declination for the EoT×Declination view and for validation.
- **Time model:** Local **mean solar time** avoids needing a timezone database offline. Slider hour `h` maps to a daily UTC instant via `UTC_hours = h − lon/15`; sampling there each day yields the analemma (equation of time produces the 8; off‑noon values tilt it).
- **Sampling/hit‑testing:** one sample per day; build the curve as an SVG path and select the nearest sample to the pointer within a pixel threshold.
- **Accuracy:** approximate, for education/visualization — not navigation. Stated in the footer.

## 6. UI / UX

- **Header:** title; language toggle; theme toggle.
- **Controls:** location (city autocomplete + live search + manual lat/long + optional geolocation); year selector; time‑of‑day slider with readout; view toggle (Sky ↔ EoT); **Markers toggle** (month ticks + solstice/equinox markers, off by default); layer toggles (golden‑hour/twilight bands). The **Location** and **Time** lines are individually **collapsible**, folded by default (FR‑18). The "today" marker is always visible and has no toggle.
- **Main canvas:** responsive inline **SVG** with the analemma, horizon line, axes/labels, markers, and the highlighted point.
- **Info panel:** per‑date details (see FR‑5); pinned on tap.
- **Footer:** attribution (SunCalc, Open‑Meteo) and accuracy caveat.

## 7. Non‑functional requirements

- **Self‑contained:** one `index.html`; opens via `file://`; offline‑capable (network only for optional live geocoding).
- **Performance:** initial render and slider/toggle updates feel instant (≤ ~16 ms per frame target for redraws of ~365 points).
- **Responsive:** usable from ~320 px wide up to desktop.
- **Accessibility:** keyboard‑operable controls; sufficient contrast in both themes; the info panel readable by screen readers.
- **No build tooling required.**

## 8. Tech & dependencies

- Vanilla JS + inline SVG + CSS custom properties (theming).
- **SunCalc** vendored inline (MIT).
- **Open‑Meteo Geocoding API** (`https://geocoding-api.open-meteo.com/v1/search`) — optional, no key.
- Inline bundled city list (~150 entries).

## 9. Deliverables

- `PRD.md` (this document).
- `index.html` — the complete standalone application.

## 10. Out of scope / future

- Animated year‑sweep playback.
- Additional languages beyond EN/PL.
- Civil (timezone‑aware) clock‑time basis in addition to mean solar time.
- Saving/comparing multiple locations side by side.
- A horizon/landscape silhouette behind the sky view.

## 11. Acceptance criteria

1. Opening `index.html` directly in a browser (no server) renders a figure‑8 for a default location.
2. Solstice points sit at the declination extremes; at LMST 12:00 the figure‑8 is near‑symmetric about the meridian.
3. Equatorial day length ≈ 12 h year‑round; mid‑latitude seasonal day lengths look correct; polar latitudes handle no‑sunrise/no‑sunset without errors.
4. A spot‑checked city/date sunrise & sunset matches a known reference within a small margin.
5. The time slider reshapes/tilts the curve; the view toggle switches projection; hover/tap shows the correct date and details; touch pins the panel.
6. Bundled city selection and manual lat/long work offline; live search resolves an arbitrary city when online.
7. Language and theme toggles work and persist; the shareable URL round‑trips into a fresh tab.
8. With the network disabled, the page loads and works using bundled cities and SunCalc.
