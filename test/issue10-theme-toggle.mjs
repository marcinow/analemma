/**
 * Issue 10 — Theme toggle (dark default)
 * Tests: dark default, html[data-theme], button label, CSS vars differ between
 *        themes, SVG re-renders, localStorage persistence, reload restores theme,
 *        toggle back to dark, no JS errors.
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

// ── helpers ───────────────────────────────────────────────────────────────────
async function getCSSVar(page, name) {
  return page.$eval('html', (el, n) =>
    getComputedStyle(el).getPropertyValue(n).trim(), name);
}
async function getDataTheme(page) {
  return page.$eval('html', el => el.dataset.theme ?? '');
}

// ── open a fresh page (no stored theme) ──────────────────────────────────────
const browser = await chromium.launch();

// Use a persistent context so we can test localStorage across reloads
const ctx    = await browser.newContext();
const page   = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

// Clear any leftover localStorage before starting
await page.goto(fileUrl);
await page.evaluate(() => localStorage.removeItem('theme'));
await page.reload();
await page.waitForTimeout(300);

// ── [1] Default state: dark theme ─────────────────────────────────────────────
console.log('\n[1] Default state — dark theme');
{
  const theme = await getDataTheme(page);
  ok('html[data-theme] is "dark" by default', theme === 'dark');

  const btn = await page.$eval('#btnTheme', el => el.textContent.trim());
  ok('Theme button shows ☀ (switch-to-light) in dark mode', btn === '☀');

  // Dark bg should be very dark — red channel < 30
  const bg = await getCSSVar(page, '--bg');
  ok(`--bg is defined (got "${bg}")`, bg.length > 0);

  // Verify it's actually a dark colour — parse the hex
  const isDark = /^#0[0-9a-f]/i.test(bg) || bg.includes('8,14') || bg.includes('rgb(8');
  ok('--bg looks dark in dark theme', isDark || bg.startsWith('#0'));
}

// ── [2] Theme button exists and is in the header ──────────────────────────────
console.log('\n[2] Button placement');
{
  const inHeader = await page.$eval('#btnTheme', el => el.closest('header') !== null);
  ok('#btnTheme is inside <header>', inHeader);

  const btnExists = await page.$('#btnTheme') !== null;
  ok('#btnTheme element exists', btnExists);
}

// ── [3] SVG renders in dark theme ─────────────────────────────────────────────
console.log('\n[3] SVG renders in dark theme');
{
  const rectCount = await page.$$eval('#chart rect', rs => rs.length);
  ok('SVG has at least one rect (rendered)', rectCount > 0);

  const pathCount = await page.$$eval('#chart path', ps => ps.length);
  ok('SVG has at least one path (curve rendered)', pathCount > 0);
}

// ── [4] Toggle to light theme ─────────────────────────────────────────────────
console.log('\n[4] Toggle to light theme');
{
  // Capture dark --bg before toggle
  const darkBg   = await getCSSVar(page, '--bg');
  const darkText = await getCSSVar(page, '--text');

  await page.click('#btnTheme');
  await page.waitForTimeout(200);

  const theme = await getDataTheme(page);
  ok('html[data-theme] is "light" after click', theme === 'light');

  const btn = await page.$eval('#btnTheme', el => el.textContent.trim());
  ok('Theme button shows 🌙 (switch-to-dark) in light mode', btn === '🌙');

  const lightBg   = await getCSSVar(page, '--bg');
  const lightText = await getCSSVar(page, '--text');

  ok('--bg changes when switching to light', darkBg !== lightBg);
  ok('--text changes when switching to light', darkText !== lightText);

  // Light bg should be bright — starts with #f or similar
  const isLight = /^#[ef][0-9a-f]/i.test(lightBg) || lightBg.includes('240,') || lightBg.includes('255,');
  ok('--bg looks light in light theme', isLight || lightBg.startsWith('#f'));
}

// ── [5] Key CSS variables all change on theme switch ─────────────────────────
console.log('\n[5] All theme CSS variables differ between dark and light');
{
  // Re-read dark values by toggling back temporarily
  await page.click('#btnTheme'); // back to dark
  await page.waitForTimeout(100);
  const d = {
    surface: await getCSSVar(page, '--surface'),
    border:  await getCSSVar(page, '--border'),
    accent:  await getCSSVar(page, '--accent'),
    curve:   await getCSSVar(page, '--curve'),
  };

  await page.click('#btnTheme'); // to light again
  await page.waitForTimeout(100);
  const l = {
    surface: await getCSSVar(page, '--surface'),
    border:  await getCSSVar(page, '--border'),
    accent:  await getCSSVar(page, '--accent'),
    curve:   await getCSSVar(page, '--curve'),
  };

  ok('--surface differs', d.surface !== l.surface);
  ok('--border differs',  d.border  !== l.border);
  ok('--accent differs',  d.accent  !== l.accent);
  ok('--curve differs',   d.curve   !== l.curve);
}

// ── [6] SVG re-renders after theme switch ─────────────────────────────────────
console.log('\n[6] SVG re-renders in light theme');
{
  // page is in light theme now
  const rectCount = await page.$$eval('#chart rect', rs => rs.length);
  ok('SVG still has rects after light-theme render', rectCount > 0);

  const pathCount = await page.$$eval('#chart path', ps => ps.length);
  ok('SVG still has a path after light-theme render', pathCount > 0);
}

// ── [7] localStorage persists the theme ───────────────────────────────────────
console.log('\n[7] localStorage persists theme');
{
  // Page is in light theme — check storage
  const stored = await page.evaluate(() => localStorage.getItem('theme'));
  ok('localStorage["theme"] is "light" after switching', stored === 'light');

  // Reload and verify light theme is restored
  await page.reload();
  await page.waitForTimeout(300);

  const themeAfterReload = await getDataTheme(page);
  ok('html[data-theme] is "light" after reload (localStorage restored)', themeAfterReload === 'light');

  const btnAfterReload = await page.$eval('#btnTheme', el => el.textContent.trim());
  ok('Button still shows 🌙 after reload', btnAfterReload === '🌙');
}

// ── [8] Toggle back to dark ───────────────────────────────────────────────────
console.log('\n[8] Toggle back to dark');
{
  await page.click('#btnTheme');
  await page.waitForTimeout(200);

  const theme = await getDataTheme(page);
  ok('html[data-theme] is "dark" after second toggle', theme === 'dark');

  const btn = await page.$eval('#btnTheme', el => el.textContent.trim());
  ok('Button shows ☀ again in dark mode', btn === '☀');

  const stored = await page.evaluate(() => localStorage.getItem('theme'));
  ok('localStorage["theme"] is "dark" after toggling back', stored === 'dark');
}

// ── [9] Dark theme restored on reload ────────────────────────────────────────
console.log('\n[9] Dark theme restored from localStorage on reload');
{
  await page.reload();
  await page.waitForTimeout(300);

  const theme = await getDataTheme(page);
  ok('html[data-theme] is "dark" after reload', theme === 'dark');
}

// ── [10] Other controls still work after theme switch ────────────────────────
console.log('\n[10] Other controls unaffected by theme toggle');
{
  // Switch to light
  await page.click('#btnTheme');
  await page.waitForTimeout(150);

  // Sky/EoT toggle still works
  await page.click('#btnEot');
  await page.waitForTimeout(200);
  const svgPathsEot = await page.$$eval('#chart path', ps => ps.length);
  ok('SVG renders in EoT view while light theme is active', svgPathsEot > 0);

  await page.click('#btnSky');
  await page.waitForTimeout(150);

  // Language toggle still works
  await page.click('#btnLang');
  await page.waitForTimeout(150);
  const locLabel = await page.$eval('[data-i18n="ctrl.location"]', el => el.textContent.trim());
  ok('Language toggle still works alongside theme toggle (PL: "Lokalizacja")', locLabel === 'Lokalizacja');

  await page.click('#btnLang'); // back to EN
  await page.waitForTimeout(100);

  // Theme is still light after all that
  const theme = await getDataTheme(page);
  ok('Theme is still "light" after using other controls', theme === 'light');
}

// ── [11] No JS errors throughout ─────────────────────────────────────────────
console.log('\n[11] No JS errors');
{
  ok('Zero JS errors throughout the test run', errors.length === 0);
  if (errors.length) errors.forEach(e => console.error('    JS error:', e));
}

// ── Summary ───────────────────────────────────────────────────────────────────
await browser.close();
console.log(`\n${'─'.repeat(50)}`);
console.log(`Issue 10 — Theme toggle: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
