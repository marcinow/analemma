/**
 * Issue 14 — Pinned point in shareable URL
 * Tests: clicking a point adds `pinday` (DD_MM) to the hash; opening a `pinday`
 *        URL restores the pinned panel; unpinning removes it; invalid values
 *        (overflow dates, bad format, Feb 29 in a common year) are ignored.
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

function hashParams(page) {
  const url  = page.url();
  const hash = url.includes('#') ? url.split('#')[1] : '';
  return new URLSearchParams(hash);
}

/** Click the first daily sample point on the analemma (via screen coords). */
async function clickFirstPoint(page) {
  return page.evaluate(() => {
    const svg = document.getElementById('chart');
    const ctm = svg.getScreenCTM();
    const p   = _pts[0];
    const svgPt = svg.createSVGPoint();
    svgPt.x = p.sx; svgPt.y = p.sy;
    const screen = svgPt.matrixTransform(ctm);
    return { x: screen.x, y: screen.y, doy: p.doy };
  });
}

const browser = await chromium.launch();

// ── [1] Plain load — no `pin` in hash ────────────────────────────────────────
console.log('\n[1] Plain load — no pin in hash');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const p = hashParams(page);
  ok('No hash at all on plain load', !page.url().includes('#'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [2] Clicking a point adds `pin` to the hash ───────────────────────────────
console.log('\n[2] Click point → pin added to hash');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const { x, y, doy } = await clickFirstPoint(page);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);

  // Expected pinday: convert the clicked doy → DD_MM (year 2026)
  const expectedPinday = await page.evaluate(d => doyToPinday(d, _year), doy);

  const p = hashParams(page);
  ok('Hash has `pinday` after click',        p.has('pinday'));
  ok('pinday matches DD_MM of clicked day',  p.get('pinday') === expectedPinday);
  ok('pinday matches DD_MM pattern',         /^\d{2}_\d{2}$/.test(p.get('pinday')));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [3] Clicking same point again → unpin removes `pin` from hash ─────────────
console.log('\n[3] Click same point again → pin removed from hash');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const { x, y } = await clickFirstPoint(page);
  await page.mouse.click(x, y);   // pin
  await page.waitForTimeout(200);
  ok('pin present after first click', hashParams(page).has('pinday'));

  await page.mouse.click(x, y);   // unpin
  await page.waitForTimeout(200);
  ok('pin absent after second click (unpin)', !hashParams(page).has('pinday'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [4] Info panel is pinned (has .pinned class) after click ─────────────────
console.log('\n[4] Info panel has .pinned class after click');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const { x, y } = await clickFirstPoint(page);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);

  const isPinned  = await page.$eval('#info', el => el.classList.contains('pinned'));
  const isVisible = await page.$eval('#info', el => el.style.display !== 'none');
  ok('Info panel visible after click',     isVisible);
  ok('Info panel has .pinned class',       isPinned);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [5] Clicking empty area (no nearby point) clears pin from hash ────────────
console.log('\n[5] Clicking empty area clears pin from hash');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const { x, y } = await clickFirstPoint(page);
  await page.mouse.click(x, y);   // pin a point
  await page.waitForTimeout(200);
  ok('pin present after first click', hashParams(page).has('pinday'));

  // Click the top-left corner of the chart — far from any point
  const box = await page.$eval('#chart', el => {
    const r = el.getBoundingClientRect();
    return { x: r.left + 5, y: r.top + 5 };
  });
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(200);
  ok('pin absent after clicking empty area', !hashParams(page).has('pinday'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [6] Round-trip: URL with pinday restores pinned panel ────────────────────
console.log('\n[6] Round-trip: captured hash (pinday) restores pinned info panel');
{
  // First, capture a real doy by visiting the plain page and clicking
  const setupPage = await browser.newPage();
  await setupPage.goto(fileUrl);
  await setupPage.waitForTimeout(400);
  const { doy } = await clickFirstPoint(setupPage);
  await setupPage.mouse.click(
    ...(await setupPage.evaluate(({ doy }) => {
      const svg = document.getElementById('chart');
      const ctm = svg.getScreenCTM();
      const p   = _pts.find(pt => pt.doy === doy);
      const svgPt = svg.createSVGPoint();
      svgPt.x = p.sx; svgPt.y = p.sy;
      const s = svgPt.matrixTransform(ctm);
      return [s.x, s.y];
    }, { doy }))
  );
  await setupPage.waitForTimeout(200);
  const capturedHash = setupPage.url().split('#')[1];
  await setupPage.close();

  // Now open a fresh tab with that hash
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl + '#' + capturedHash);
  await page.waitForTimeout(600);

  const isVisible = await page.$eval('#info', el => el.style.display !== 'none');
  const isPinned  = await page.$eval('#info', el => el.classList.contains('pinned'));
  const hlCx      = await page.$eval('#hl', el => parseFloat(el.getAttribute('cx')));
  const restoredDoy = await page.evaluate(() => _pinnedDoy);

  ok('Info panel visible on load with pin hash',  isVisible);
  ok('Info panel has .pinned class on restore',   isPinned);
  ok('Highlight ring positioned (cx > -100)',      hlCx > -100);
  ok('_pinnedDoy matches original doy',           restoredDoy === doy);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [7] Round-trip preserves full state alongside pinday ─────────────────────
console.log('\n[7] Round-trip with full state + pinday');
{
  // pinday=11_04 → April 11 → doy 100 in (non-leap) 2026
  const hash = '#lat=48.8566&lon=2.3522&city=Paris&year=2026&time=720&view=sky&lang=en&theme=dark&markers=0&pinday=11_04';
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl + hash);
  await page.waitForTimeout(600);

  const cityVal   = await page.$eval('#cityInput', el => el.value);
  const isVisible = await page.$eval('#info', el => el.style.display === 'block');
  const isPinned  = await page.$eval('#info', el => el.classList.contains('pinned'));
  const doy       = await page.evaluate(() => _pinnedDoy);
  const pinnedDate = await page.evaluate(() => {
    const p = _pts.find(pt => pt.doy === _pinnedDoy);
    return p ? { m: p.date.getUTCMonth() + 1, d: p.date.getUTCDate() } : null;
  });

  ok('Location restored (Paris)',          cityVal === 'Paris');
  ok('Info panel visible (pinday=11_04)',  isVisible);
  ok('Info panel pinned',                  isPinned);
  ok('_pinnedDoy === 100 (April 11)',      doy === 100);
  ok('Pinned date is April 11',            pinnedDate && pinnedDate.m === 4 && pinnedDate.d === 11);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [8] Invalid pinday value is ignored, page still loads ────────────────────
console.log('\n[8] Invalid pinday= values are ignored gracefully');
{
  for (const [label, badHash] of [
    ['pinday=31_02 (Feb 31, overflow)', '#lat=52.2297&lon=21.0122&pinday=31_02'],
    ['pinday=00_01 (day 0)',            '#lat=52.2297&lon=21.0122&pinday=00_01'],
    ['pinday=06_13 (month 13)',         '#lat=52.2297&lon=21.0122&pinday=06_13'],
    ['pinday=abc (non-numeric)',        '#lat=52.2297&lon=21.0122&pinday=abc'],
    ['pinday=29_02 (Feb 29 common yr)', '#lat=52.2297&lon=21.0122&year=2026&pinday=29_02'],
  ]) {
    const page   = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(fileUrl + badHash);
    await page.waitForTimeout(400);

    const isVisible  = await page.$eval('#info', el => el.style.display === 'block');
    const pinnedDoy  = await page.evaluate(() => _pinnedDoy);
    const svgPath    = await page.$('#chart path');

    ok(`${label} — info panel NOT shown`, !isVisible);
    ok(`${label} — _pinnedDoy is null`,   pinnedDoy === null);
    ok(`${label} — analemma still renders`, svgPath !== null);
    ok(`${label} — no JS errors`,         errors.length === 0);
    await page.close();
  }
}

// ── [9] Changing time slider clears pin from hash ────────────────────────────
console.log('\n[9] Time slider change clears pin from hash');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const { x, y } = await clickFirstPoint(page);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
  ok('pin present before slider move', hashParams(page).has('pinday'));

  await page.evaluate(() => {
    const s = document.getElementById('timeSlider');
    s.value = '360';
    s.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(200);
  ok('pin absent after slider move', !hashParams(page).has('pinday'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [10] View toggle clears pin from hash ────────────────────────────────────
console.log('\n[10] View toggle clears pin from hash');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const { x, y } = await clickFirstPoint(page);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
  ok('pin present before view toggle', hashParams(page).has('pinday'));

  await page.click('#btnEot');
  await page.waitForTimeout(200);
  ok('pin absent after EoT toggle', !hashParams(page).has('pinday'));
  ok('view=eot in hash',             hashParams(page).get('view') === 'eot');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [11] Location change clears pin from hash ─────────────────────────────────
console.log('\n[11] Location change clears pin from hash');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const { x, y } = await clickFirstPoint(page);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
  ok('pin present before location change', hashParams(page).has('pinday'));

  await page.click('#locToggle');
  await page.waitForTimeout(100);
  await page.fill('#cityInput', 'London');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  ok('pin absent after location change', !hashParams(page).has('pinday'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

await browser.close();

console.log(`\n${'─'.repeat(48)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
