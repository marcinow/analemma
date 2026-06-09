/**
 * Regression tests for Issue 7 — EoT × Declination projection toggle
 *
 * Covers:
 *  - Sky / EoT toggle button state
 *  - Axis labels and grid ticks per view
 *  - EoT figure-8 is location-independent
 *  - Sky figure-8 is location-dependent
 *  - Info panel shows correct fields per view
 *  - EoT tick range is astronomically plausible (≈ −16 … +14 min)
 *  - No JS errors
 *
 * Run:  node test/issue7-eot-toggle.mjs
 */

import { chromium }      from 'playwright';
import { fileURLToPath }  from 'url';
import path               from 'path';

const FILE = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.html');

// ── Tiny assertion helper ─────────────────────────────────────────────────────
let passed = 0, failed = 0;
function ok(name, cond, detail = '') {
  if (cond) { console.log(`  ✓ ${name}`); passed++; }
  else       { console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ── Browser setup ─────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const page    = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
await page.goto(FILE);
await page.waitForTimeout(500);

// Helper: convert a midpoint dot in the current render to screen coordinates
async function midDotScreen() {
  return page.evaluate(() => {
    const svg  = document.getElementById('chart');
    const ctm  = svg.getScreenCTM();
    const dots = [...svg.querySelectorAll('g[clip-path] circle')];
    const mid  = dots[Math.floor(dots.length / 2)];
    const pt   = svg.createSVGPoint();
    pt.x = parseFloat(mid.getAttribute('cx'));
    pt.y = parseFloat(mid.getAttribute('cy'));
    const sp = pt.matrixTransform(ctm);
    return { x: sp.x, y: sp.y };
  });
}

// Helper: select a city by name via the autocomplete
async function selectCity(name) {
  // Ensure the Location panel is open (Issue 8a folds it by default)
  const isOpen = await page.$eval('#loc-panel', el => el.classList.contains('open'));
  if (!isOpen) await page.click('#locToggle');
  await page.waitForTimeout(100);
  await page.click('#cityInput', { clickCount: 3 });
  await page.type('#cityInput', name);
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// [1] Initial state: Sky view active
console.log('\n[1] Initial state (Sky view)');
ok('Sky button active',     await page.$eval('#btnSky', b => b.classList.contains('active')));
ok('EoT button not active', await page.$eval('#btnEot', b => !b.classList.contains('active')));
const sub0 = await page.$eval('#subtitle', e => e.textContent);
ok('Subtitle contains "Sky"', sub0.includes('Sky'), sub0);
const ax0 = await page.$$eval('#chart text.ax-title', es => es.map(e => e.textContent));
ok('Altitude axis label present',    ax0.some(t => t.includes('Altitude')));
ok('Azimuth axis label present',     ax0.some(t => t.includes('Azimuth')));
ok('No Declination label in Sky',    !ax0.some(t => t.includes('Declination')));
ok('No EoT label in Sky',            !ax0.some(t => t.includes('Equation')));
const txt0 = await page.$$eval('#chart text', es => es.map(e => e.textContent));
ok('Horizon label present in Sky',   txt0.some(t => t === 'Horizon'));
ok('No Equator label in Sky',        !txt0.some(t => t === 'Equator'));

// [2] Switch to EoT view
console.log('\n[2] Switch to EoT view');
await page.click('#btnEot');
await page.waitForTimeout(200);
ok('EoT button becomes active',   await page.$eval('#btnEot', b => b.classList.contains('active')));
ok('Sky button becomes inactive', await page.$eval('#btnSky', b => !b.classList.contains('active')));
const sub1 = await page.$eval('#subtitle', e => e.textContent);
ok('Subtitle contains "EoT"', sub1.includes('EoT'), sub1);
const ax1 = await page.$$eval('#chart text.ax-title', es => es.map(e => e.textContent));
ok('Declination axis label present', ax1.some(t => t.includes('Declination')));
ok('EoT axis label present',         ax1.some(t => t.includes('Equation')));
ok('No Altitude label in EoT view',  !ax1.some(t => t.includes('Altitude')));
ok('No Azimuth label in EoT view',   !ax1.some(t => t.includes('Azimuth')));
const txt1 = await page.$$eval('#chart text', es => es.map(e => e.textContent));
ok('Equator label present in EoT',   txt1.some(t => t === 'Equator'));
ok('No Horizon label in EoT',        !txt1.some(t => t === 'Horizon'));
ok('Declination tick "0°"',          txt1.some(t => t === '0°'));
ok('Declination tick "+25°"',        txt1.some(t => t === '25°'));
ok('Declination tick "-25°"',        txt1.some(t => t === '-25°'));
ok('EoT signed minute ticks present', txt1.some(t => /^\+\d+$/.test(t) || /^-\d{1,2}$/.test(t)),
   txt1.filter(t => /^[+-]?\d+$/.test(t)).join(', '));

// [3] EoT shape is location-independent
console.log('\n[3] EoT shape is location-independent');
const pathWarsaw = await page.$eval('#chart path', p => p.getAttribute('d'));
await selectCity('Tokyo');
const pathTokyo = await page.$eval('#chart path', p => p.getAttribute('d'));
ok('EoT path identical for Warsaw and Tokyo', pathWarsaw === pathTokyo,
   `len Warsaw=${pathWarsaw.length}, Tokyo=${pathTokyo.length}`);

// [4] Sky view IS location-dependent
console.log('\n[4] Sky view is location-dependent');
await selectCity('Warsaw');
await page.click('#btnSky');
await page.waitForTimeout(200);
const skyWarsaw = await page.$eval('#chart path', p => p.getAttribute('d'));
await selectCity('Tokyo');
const skyTokyo = await page.$eval('#chart path', p => p.getAttribute('d'));
ok('Sky path differs between Warsaw and Tokyo', skyWarsaw !== skyTokyo);

// [5] Info panel in EoT view shows EoT + Declination
console.log('\n[5] Info panel in EoT view');
await page.click('#btnEot');
await page.waitForTimeout(200);
const ptEot = await midDotScreen();
await page.mouse.move(ptEot.x, ptEot.y);
await page.waitForTimeout(300);
const infoEotVisible = await page.$eval('#info', el => el.style.display !== 'none');
ok('Info panel visible on hover (EoT view)', infoEotVisible);
if (infoEotVisible) {
  const txt = await page.$eval('#info', el => el.innerText);
  const one = txt.replace(/\n/g, ' ');
  ok('Shows "Eq. of Time"',        txt.includes('Eq. of Time'),            one);
  ok('Shows "Declination"',        txt.includes('Declination'),             one);
  ok('EoT value has sign and unit', /[+\-]\d+\.\d+ min/.test(txt),         one);
  ok('Shows sunrise/sunset data',  txt.includes('Sunrise') || txt.includes('Sun'), one);
  ok('No "Altitude" row',          !txt.includes('Altitude'),               one);
  ok('No "Azimuth" row',           !txt.includes('Azimuth'),                one);
}

// [6] Info panel in Sky view shows Altitude + Azimuth
console.log('\n[6] Info panel in Sky view');
await page.click('#btnSky');
await page.waitForTimeout(200);
const ptSky = await midDotScreen();
await page.mouse.move(ptSky.x, ptSky.y);
await page.waitForTimeout(300);
const infoSkyVisible = await page.$eval('#info', el => el.style.display !== 'none');
ok('Info panel visible on hover (Sky view)', infoSkyVisible);
if (infoSkyVisible) {
  const txt2 = await page.$eval('#info', el => el.innerText);
  const one2 = txt2.replace(/\n/g, ' ');
  ok('Shows "Altitude"',       txt2.includes('Altitude'),       one2);
  ok('Shows "Azimuth"',        txt2.includes('Azimuth'),        one2);
  ok('No "Eq. of Time" row',   !txt2.includes('Eq. of Time'),   one2);
  ok('No "Declination" row',   !txt2.includes('Declination'),   one2);
}

// [7] EoT tick range is astronomically plausible
console.log('\n[7] EoT tick range plausibility');
await page.click('#btnEot');
await page.waitForTimeout(200);
const ticks = await page.$$eval('#chart text', es => es.map(e => e.textContent));
const eotNums = ticks
  .filter(t => /^[+\-]?\d+$/.test(t) && !t.endsWith('°'))
  .map(Number)
  .filter(n => n !== 0);
const minEot = Math.min(...eotNums), maxEot = Math.max(...eotNums);
ok(`Negative EoT ticks present (min = ${minEot} min)`, minEot < -10);
ok(`Positive EoT ticks present (max = ${maxEot} min)`, maxEot > 10);
ok(`EoT range within ±20 min`,  minEot >= -20 && maxEot <= 20);

// [8] No JS errors throughout
console.log('\n[8] No JS errors');
ok('Zero console errors', jsErrors.length === 0, jsErrors.join('; '));

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log('─'.repeat(52));

await browser.close();
process.exit(failed > 0 ? 1 : 0);
