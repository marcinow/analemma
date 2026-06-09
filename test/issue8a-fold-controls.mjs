/**
 * Issue 8a — Fold/unfold Location & Time control lines
 * Tests: panels folded by default, toggle open/close, independent state,
 *        summary text updates, always-visible controls, chart unaffected.
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
const page    = await browser.newPage();
const errors  = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(fileUrl);
await page.waitForTimeout(300);

// ── [1] Initial state: both panels folded ────────────────────────────────────
console.log('\n[1] Initial state — both panels folded by default');
{
  const locOpen = await page.$eval('#loc-panel',  el => el.classList.contains('open'));
  ok('Location panel folded by default',           !locOpen);

  const timeOpen = await page.$eval('#time-panel', el => el.classList.contains('open'));
  ok('Time panel folded by default',               !timeOpen);

  const locExpanded  = await page.$eval('#locToggle',  b => b.getAttribute('aria-expanded'));
  ok('locToggle aria-expanded="false" initially',  locExpanded  === 'false');

  const timeExpanded = await page.$eval('#timeToggle', b => b.getAttribute('aria-expanded'));
  ok('timeToggle aria-expanded="false" initially', timeExpanded === 'false');

  const locVisible  = await page.$eval('#loc-panel',  el => getComputedStyle(el).display !== 'none');
  ok('Location panel not visible initially',       !locVisible);

  const timeVisible = await page.$eval('#time-panel', el => getComputedStyle(el).display !== 'none');
  ok('Time panel not visible initially',           !timeVisible);
}

// ── [2] Summary labels show correct initial values ───────────────────────────
console.log('\n[2] Summary labels');
{
  const locSummary  = await page.$eval('#locSummary',  el => el.textContent.trim());
  ok(`Location summary shows default city ("${locSummary}")`, locSummary.length > 0);

  const timeSummary = await page.$eval('#timeSummary', el => el.textContent.trim());
  ok(`Time summary shows initial time (${timeSummary})`, /^\d{2}:\d{2}$/.test(timeSummary));

  // ctrl-bar itself is always visible
  const barVisible = await page.$eval('#ctrl-bar', el => getComputedStyle(el).display !== 'none');
  ok('ctrl-bar is visible', barVisible);
}

// ── [3] Toggle Location open ──────────────────────────────────────────────────
console.log('\n[3] Toggle Location open');
{
  await page.click('#locToggle');
  await page.waitForTimeout(150);

  const locOpen = await page.$eval('#loc-panel', el => el.classList.contains('open'));
  ok('Location panel has class "open" after click', locOpen);

  const locExpanded = await page.$eval('#locToggle', b => b.getAttribute('aria-expanded'));
  ok('locToggle aria-expanded="true" after click',  locExpanded === 'true');

  const locVisible = await page.$eval('#loc-panel', el => getComputedStyle(el).display !== 'none');
  ok('Location panel is visible after opening',     locVisible);

  const cityInput = await page.$('#cityInput');
  ok('City input is present in open panel',         cityInput !== null);

  const latInput = await page.$('#latInput');
  ok('Lat input is present in open panel',          latInput !== null);
}

// ── [4] Toggle Location closed ────────────────────────────────────────────────
console.log('\n[4] Toggle Location closed');
{
  await page.click('#locToggle');
  await page.waitForTimeout(150);

  const locOpen = await page.$eval('#loc-panel', el => el.classList.contains('open'));
  ok('Location panel loses "open" after second click', !locOpen);

  const locExpanded = await page.$eval('#locToggle', b => b.getAttribute('aria-expanded'));
  ok('locToggle aria-expanded="false" after closing',  locExpanded === 'false');

  const locVisible = await page.$eval('#loc-panel', el => getComputedStyle(el).display !== 'none');
  ok('Location panel hidden after closing',           !locVisible);
}

// ── [5] Toggle Time open ──────────────────────────────────────────────────────
console.log('\n[5] Toggle Time open');
{
  await page.click('#timeToggle');
  await page.waitForTimeout(150);

  const timeOpen = await page.$eval('#time-panel', el => el.classList.contains('open'));
  ok('Time panel has class "open" after click', timeOpen);

  const timeExpanded = await page.$eval('#timeToggle', b => b.getAttribute('aria-expanded'));
  ok('timeToggle aria-expanded="true" after click',  timeExpanded === 'true');

  const timeVisible = await page.$eval('#time-panel', el => getComputedStyle(el).display !== 'none');
  ok('Time panel is visible after opening',          timeVisible);

  const slider = await page.$('#timeSlider');
  ok('Time slider is present in open panel',         slider !== null);
}

// ── [6] Toggle Time closed ────────────────────────────────────────────────────
console.log('\n[6] Toggle Time closed');
{
  await page.click('#timeToggle');
  await page.waitForTimeout(150);

  const timeOpen = await page.$eval('#time-panel', el => el.classList.contains('open'));
  ok('Time panel loses "open" after second click', !timeOpen);

  const timeExpanded = await page.$eval('#timeToggle', b => b.getAttribute('aria-expanded'));
  ok('timeToggle aria-expanded="false" after closing', timeExpanded === 'false');

  const timeVisible = await page.$eval('#time-panel', el => getComputedStyle(el).display !== 'none');
  ok('Time panel hidden after closing',               !timeVisible);
}

// ── [7] Both panels open simultaneously ──────────────────────────────────────
console.log('\n[7] Both panels can be open at the same time');
{
  await page.click('#locToggle');
  await page.click('#timeToggle');
  await page.waitForTimeout(150);

  const locOpen  = await page.$eval('#loc-panel',  el => el.classList.contains('open'));
  const timeOpen = await page.$eval('#time-panel', el => el.classList.contains('open'));
  ok('Location panel open',                          locOpen);
  ok('Time panel open simultaneously',               timeOpen);

  // Close both for subsequent tests
  await page.click('#locToggle');
  await page.click('#timeToggle');
  await page.waitForTimeout(150);
}

// ── [8] Panels are independent ────────────────────────────────────────────────
console.log('\n[8] Panels toggle independently');
{
  // Open Location only
  await page.click('#locToggle');
  await page.waitForTimeout(150);

  const locOpen  = await page.$eval('#loc-panel',  el => el.classList.contains('open'));
  const timeOpen = await page.$eval('#time-panel', el => el.classList.contains('open'));
  ok('Location open, Time still closed',   locOpen && !timeOpen);

  // Close Location, open Time
  await page.click('#locToggle');
  await page.click('#timeToggle');
  await page.waitForTimeout(150);

  const locOpen2  = await page.$eval('#loc-panel',  el => el.classList.contains('open'));
  const timeOpen2 = await page.$eval('#time-panel', el => el.classList.contains('open'));
  ok('Time open, Location now closed',   !locOpen2 && timeOpen2);

  // Reset
  await page.click('#timeToggle');
  await page.waitForTimeout(100);
}

// ── [9] Summary updates after city selection ──────────────────────────────────
console.log('\n[9] Location summary updates when city changes');
{
  await page.click('#locToggle');
  await page.waitForTimeout(150);

  await page.fill('#cityInput', 'Paris');
  await page.waitForTimeout(200);
  // Select the first dropdown item
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);

  const summary = await page.$eval('#locSummary', el => el.textContent.trim());
  ok(`locSummary updated after city select ("${summary}")`, summary.toLowerCase().includes('paris'));

  await page.click('#locToggle');
  await page.waitForTimeout(100);
}

// ── [10] Summary updates after slider move ────────────────────────────────────
console.log('\n[10] Time summary updates when slider moves');
{
  await page.click('#timeToggle');
  await page.waitForTimeout(150);

  // Set slider to 06:00 (360 minutes)
  await page.$eval('#timeSlider', el => { el.value = 360; el.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(150);

  const summary = await page.$eval('#timeSummary', el => el.textContent.trim());
  ok(`timeSummary updated after slider move ("${summary}")`, summary === '06:00');

  const readout = await page.$eval('#timeReadout', el => el.textContent.trim());
  ok('timeReadout (inside panel) also updated', readout === '06:00');

  await page.click('#timeToggle');
  await page.waitForTimeout(100);
}

// ── [11] Always-visible controls unaffected by folds ─────────────────────────
console.log('\n[11] Always-visible controls in ctrl-bar');
{
  const skyBtn     = await page.$('#btnSky');
  const eotBtn     = await page.$('#btnEot');
  const markersBtn = await page.$('#btnMarkers');
  ok('Sky button always present',     skyBtn     !== null);
  ok('EoT button always present',     eotBtn     !== null);
  ok('Markers button always present', markersBtn !== null);

  // They should be interactable — click Sky and EoT to verify
  await page.click('#btnEot');
  await page.waitForTimeout(150);
  const eotActive = await page.$eval('#btnEot', b => b.classList.contains('active'));
  ok('EoT button activates normally', eotActive);

  await page.click('#btnSky');
  await page.waitForTimeout(150);
}

// ── [12] Chart renders with both panels folded ────────────────────────────────
console.log('\n[12] Chart renders correctly with panels folded');
{
  // Ensure both are closed
  const locOpen  = await page.$eval('#loc-panel',  el => el.classList.contains('open'));
  const timeOpen = await page.$eval('#time-panel', el => el.classList.contains('open'));
  if (locOpen)  await page.click('#locToggle');
  if (timeOpen) await page.click('#timeToggle');
  await page.waitForTimeout(150);

  const pathExists = await page.$eval('#chart', svg => svg.querySelector('path') !== null);
  ok('SVG path (analemma curve) present', pathExists);

  const todayLabel = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('text')].some(t => t.textContent.trim() === 'Today')
  );
  ok('"Today" marker visible with panels folded', todayLabel);
}

// ── [13] No JS errors ─────────────────────────────────────────────────────────
console.log('\n[13] No JS errors');
ok('Zero console errors', errors.length === 0);
if (errors.length) errors.forEach(e => console.error('   ', e));

await browser.close();

console.log('\n' + '─'.repeat(52));
console.log(`  ${passed} passed, ${failed} failed`);
console.log('─'.repeat(52) + '\n');
process.exit(failed > 0 ? 1 : 0);
