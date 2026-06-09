/**
 * Issue 8 — Markers + "today"
 * Tests: solstice/equinox markers, 1st-of-month ticks, today marker, both views.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

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

// ── [1] Today marker ──────────────────────────────────────────────────────────
console.log('\n[1] Today marker (Sky view)');
{
  // There should be two concentric amber circles (glow + dot) for today
  const amberCircles = await page.$$eval('#chart circle[fill="var(--accent)"]', els => els.length);
  ok('Today has amber circle(s)', amberCircles >= 1);

  const todayLabel = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('text')].some(t => t.textContent.trim() === 'Today')
  );
  ok('"Today" label present', todayLabel);
}

// ── [2] Month ticks ───────────────────────────────────────────────────────────
console.log('\n[2] Month start ticks (Sky view)');
{
  const monthAbbrs = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labels = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('text')].map(t => t.textContent.trim())
  );
  const found = monthAbbrs.filter(m => labels.includes(m));
  // At least 10 month labels (some may overlap with solstice/equinox and be skipped)
  ok(`Month labels present (${found.length}/12)`, found.length >= 10);

  // Month tick circles: stroke=var(--muted), r=3
  const monthCircles = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[stroke="var(--muted)"]')].filter(c => c.getAttribute('r') === '3').length
  );
  ok(`Month tick circles present (${monthCircles})`, monthCircles >= 8);
}

// ── [3] Solstice markers ─────────────────────────────────────────────────────
console.log('\n[3] Solstice markers (Sky view)');
{
  // Orange circles for summer solstice
  const orangeCircles = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[fill="#f5a623"]')].length
  );
  ok('Summer solstice marker (orange) present', orangeCircles >= 1);

  // Blue circles for winter solstice
  const blueCircles = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[fill="#93c5fd"]')].length
  );
  ok('Winter solstice marker (blue) present', blueCircles >= 1);

  // Solstice labels — should contain a month+day for June and December
  const labels = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('text')].map(t => t.textContent.trim())
  );
  const hasJune = labels.some(l => l.startsWith('Jun'));
  const hasDec  = labels.some(l => l.startsWith('Dec'));
  ok('June solstice date label present', hasJune);
  ok('December solstice date label present', hasDec);
}

// ── [4] Equinox markers ───────────────────────────────────────────────────────
console.log('\n[4] Equinox markers (Sky view)');
{
  const tealCircles = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[fill="#5eead4"]')].length
  );
  ok('Two equinox markers (teal) present', tealCircles >= 2);

  const labels = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('text')].map(t => t.textContent.trim())
  );
  const hasMar = labels.some(l => l.startsWith('Mar'));
  const hasSep = labels.some(l => l.startsWith('Sep'));
  ok('March equinox label present', hasMar);
  ok('September equinox label present', hasSep);
}

// ── [5] Solstice positions plausibility ───────────────────────────────────────
console.log('\n[5] Solstice position plausibility');
{
  // Summer solstice should be near the top of the plot (small cy), winter near bottom (large cy)
  const positions = await page.$eval('#chart', svg => {
    const orange = [...svg.querySelectorAll('circle[fill="#f5a623"]')].map(c => +c.getAttribute('cy'));
    const blue   = [...svg.querySelectorAll('circle[fill="#93c5fd"]')].map(c => +c.getAttribute('cy'));
    return { orangeCy: orange[0] ?? null, blueCy: blue[0] ?? null };
  });
  ok('Summer solstice is above winter solstice (cy summer < cy winter)',
     positions.orangeCy !== null && positions.blueCy !== null &&
     positions.orangeCy < positions.blueCy);
}

// ── [6] Markers in EoT view ───────────────────────────────────────────────────
console.log('\n[6] Markers in EoT × Declination view');
{
  await page.click('#btnEot');
  await page.waitForTimeout(200);

  const orangeCircles = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[fill="#f5a623"]')].length
  );
  ok('Summer solstice marker present in EoT view', orangeCircles >= 1);

  const blueCircles = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[fill="#93c5fd"]')].length
  );
  ok('Winter solstice marker present in EoT view', blueCircles >= 1);

  const tealCircles = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[fill="#5eead4"]')].length
  );
  ok('Equinox markers present in EoT view', tealCircles >= 2);

  const todayLabel = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('text')].some(t => t.textContent.trim() === 'Today')
  );
  ok('"Today" label present in EoT view', todayLabel);

  // In EoT view, equinoxes should be near y=0 declination line
  // Teal circles should be near the equator (middle of the chart, ph/2 from top)
  const tealCys = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[fill="#5eead4"]')].map(c => +c.getAttribute('cy'))
  );
  const viewH = 540, marginTop = 32, ph = 540 - 32 - 58;
  const equatorY = marginTop + ph / 2; // ~239
  const closeToEquator = tealCys.some(cy => Math.abs(cy - equatorY) < 40);
  ok('Equinox markers near equator line in EoT view', closeToEquator);
}

// ── [7] Switch back to Sky — markers still present ───────────────────────────
console.log('\n[7] Markers persist after toggling back to Sky view');
{
  await page.click('#btnSky');
  await page.waitForTimeout(200);

  const monthCircles = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('circle[stroke="var(--muted)"]')].filter(c => c.getAttribute('r') === '3').length
  );
  ok('Month ticks present after Sky toggle', monthCircles >= 8);

  const todayLabel = await page.$eval('#chart', svg =>
    [...svg.querySelectorAll('text')].some(t => t.textContent.trim() === 'Today')
  );
  ok('"Today" label present after Sky toggle', todayLabel);
}

// ── [8] No JS errors ─────────────────────────────────────────────────────────
console.log('\n[8] No JS errors');
ok('Zero console errors', errors.length === 0);

await browser.close();

console.log('\n' + '─'.repeat(52));
console.log(`  ${passed} passed, ${failed} failed`);
console.log('─'.repeat(52) + '\n');
process.exit(failed > 0 ? 1 : 0);
