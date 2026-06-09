/**
 * Issue 12 — Shareable URL state
 * Tests: state is written to hash on interaction; opening a hash URL restores
 *        location, time, view, lang, theme, markers.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath  = path.resolve(__dirname, '..', 'index.html');
const fileUrl   = 'file://' + htmlPath;

let passed = 0, failed = 0;

function ok(label, cond) {
  if (cond) { console.log(`  ✓ ${label}`); passed++; }
  else       { console.error(`  ✗ ${label}`); failed++; }
}

const browser = await chromium.launch();

// ── Helper: parse the hash from the current page URL ─────────────────────────
function hashParams(page) {
  const url  = page.url();
  const hash = url.includes('#') ? url.split('#')[1] : '';
  return new URLSearchParams(hash);
}

// ── [1] No hash on plain load — page works, no hash is added ─────────────────
console.log('\n[1] Plain load — no hash added automatically');
{
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const url = page.url();
  ok('URL has no hash fragment', !url.includes('#'));
  const svgPath = await page.$('#chart path');
  ok('Analemma renders without hash', svgPath !== null);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [2] Hash is written when location changes ─────────────────────────────────
console.log('\n[2] Location change → hash updated');
{
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // Open location panel and select London from bundled list
  await page.click('#locToggle');
  await page.waitForTimeout(100);
  await page.fill('#cityInput', 'London');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  const p = hashParams(page);
  ok('Hash has lat', p.has('lat'));
  ok('Hash has lon', p.has('lon'));
  ok('city=London in hash', p.get('city') === 'London');
  ok('lat ≈ 51.5 (London)', Math.abs(parseFloat(p.get('lat')) - 51.5) < 0.5);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [3] Hash is written when time slider changes ──────────────────────────────
console.log('\n[3] Time slider change → hash updated');
{
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // Set slider to 06:00 (360 minutes)
  await page.evaluate(() => {
    const s = document.getElementById('timeSlider');
    s.value = '360';
    s.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(200);

  const p = hashParams(page);
  ok('Hash has time=360', p.get('time') === '360');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [4] Hash is written when view toggles ────────────────────────────────────
console.log('\n[4] View toggle → hash updated');
{
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnEot');
  await page.waitForTimeout(200);
  const pEot = hashParams(page);
  ok('view=eot after EoT click', pEot.get('view') === 'eot');

  await page.click('#btnSky');
  await page.waitForTimeout(200);
  const pSky = hashParams(page);
  ok('view=sky after Sky click', pSky.get('view') === 'sky');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [5] Hash is written when lang toggles ────────────────────────────────────
console.log('\n[5] Language toggle → hash updated');
{
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnLang');
  await page.waitForTimeout(200);
  const p = hashParams(page);
  ok('lang=pl after PL click', p.get('lang') === 'pl');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [6] Hash is written when theme toggles ───────────────────────────────────
console.log('\n[6] Theme toggle → hash updated');
{
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnTheme');
  await page.waitForTimeout(200);
  const p = hashParams(page);
  ok('theme=light after toggle', p.get('theme') === 'light');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [7] Hash is written when markers toggle ──────────────────────────────────
console.log('\n[7] Markers toggle → hash updated');
{
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnMarkers');
  await page.waitForTimeout(200);
  const p = hashParams(page);
  ok('markers=1 after toggle', p.get('markers') === '1');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [8] Round-trip: hash URL restores full state ─────────────────────────────
console.log('\n[8] Round-trip: open URL with all params → state restored');
{
  const hash = '#lat=48.8566&lon=2.3522&city=Paris&year=2026&time=480&view=eot&lang=pl&theme=light&markers=1';
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl + hash);
  await page.waitForTimeout(400);

  // Location
  const latVal = await page.$eval('#latInput', el => el.value);
  const lonVal = await page.$eval('#lonInput', el => el.value);
  ok('lat input ≈ 48.8566', Math.abs(parseFloat(latVal) - 48.8566) < 0.01);
  ok('lon input ≈ 2.3522',  Math.abs(parseFloat(lonVal) - 2.3522)  < 0.01);
  const cityVal = await page.$eval('#cityInput', el => el.value);
  ok('city input = Paris', cityVal === 'Paris');
  const locSummary = await page.$eval('#locSummary', el => el.textContent);
  ok('locSummary shows Paris', locSummary === 'Paris');

  // Time
  const sliderVal = await page.$eval('#timeSlider', el => el.value);
  ok('slider = 480 (08:00)', sliderVal === '480');
  const readout = await page.$eval('#timeReadout', el => el.textContent);
  ok('timeReadout = 08:00', readout === '08:00');

  // View — EoT toggle button should be active
  const eotActive = await page.$eval('#btnEot', el => el.classList.contains('active'));
  const skyActive = await page.$eval('#btnSky', el => el.classList.contains('active'));
  ok('EoT button active', eotActive);
  ok('Sky button NOT active', !skyActive);

  // Language — Polish
  const langBtn = await page.$eval('#btnLang', el => el.textContent);
  ok('lang button shows EN (target lang)', langBtn === 'EN');
  const locationLabel = await page.$eval('[data-i18n="ctrl.location"]', el => el.textContent);
  ok('ctrl.location in Polish', locationLabel === 'Lokalizacja');

  // Theme — light
  const themAttr = await page.$eval('html', el => el.dataset.theme);
  ok('theme = light', themAttr === 'light');

  // Markers — on
  const markersActive = await page.$eval('#btnMarkers', el => el.classList.contains('active'));
  ok('Markers button active', markersActive);

  // SVG renders
  const svgPath = await page.$('#chart path');
  ok('Analemma SVG path rendered', svgPath !== null);

  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [9] Partial hash (lat/lon only) still works ───────────────────────────────
console.log('\n[9] Partial hash — lat/lon only');
{
  const hash = '#lat=35.6762&lon=139.6503&city=Tokyo';
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl + hash);
  await page.waitForTimeout(400);

  const latVal = await page.$eval('#latInput', el => el.value);
  ok('lat ≈ 35.68 (Tokyo)', Math.abs(parseFloat(latVal) - 35.6762) < 0.01);
  const svgPath = await page.$('#chart path');
  ok('Analemma renders', svgPath !== null);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [10] Invalid hash is gracefully ignored ───────────────────────────────────
console.log('\n[10] Invalid hash — falls back to defaults');
{
  const page  = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl + '#lat=999&lon=999');
  await page.waitForTimeout(400);

  const cityVal = await page.$eval('#cityInput', el => el.value);
  ok('Falls back to Warsaw on invalid coords', cityVal === 'Warsaw');
  const svgPath = await page.$('#chart path');
  ok('Analemma still renders', svgPath !== null);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

await browser.close();

console.log(`\n${'─'.repeat(48)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
