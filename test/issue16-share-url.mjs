/**
 * Issue 16 — Copy / share URL button
 * Tests: button present in header; clicking it shows a transient "Copied!"
 *        confirmation that disappears after ~2 s; confirmation text is
 *        localized (EN/PL); button is always visible; chart unaffected;
 *        zero JS errors throughout.
 *
 * Note: navigator.clipboard is unavailable in the file:// context during
 *       headless Playwright tests, so we verify the fallback path doesn't
 *       throw and that the toast still appears.
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

// ── [1] Initial state — button present, toast hidden ─────────────────────────
console.log('\n[1] Initial state — #btnShare present, toast hidden by default');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const btnExists   = await page.$('#btnShare') !== null;
  const toastExists = await page.$('#share-toast') !== null;
  const toastHidden = !(await page.isVisible('#share-toast'));

  ok('#btnShare element exists',            btnExists);
  ok('#share-toast element exists',         toastExists);
  ok('toast is hidden on load',             toastHidden);
  ok('No JS errors',                        errors.length === 0);
  await page.close();
}

// ── [2] Button visible in header alongside other controls ────────────────────
console.log('\n[2] #btnShare is visible in the header alongside other buttons');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const shareVisible = await page.isVisible('#btnShare');
  const themeVisible = await page.isVisible('#btnTheme');
  const langVisible  = await page.isVisible('#btnLang');
  const infoVisible  = await page.isVisible('#btnInfo');

  ok('#btnShare is visible',  shareVisible);
  ok('#btnTheme is visible',  themeVisible);
  ok('#btnLang is visible',   langVisible);
  ok('#btnInfo is visible',   infoVisible);
  ok('No JS errors',          errors.length === 0);
  await page.close();
}

// ── [3] Click shows English "Copied!" toast ───────────────────────────────────
console.log('\n[3] Click #btnShare → EN toast "Copied!" appears');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // Grant clipboard permissions so the API path is exercised when available
  const ctx = page.context();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnShare');
  await page.waitForTimeout(150);

  const toastVisible = await page.isVisible('#share-toast');
  const toastText    = (await page.textContent('#share-toast')).trim();

  ok('toast is visible after click',        toastVisible);
  ok('toast text is "Copied!" (EN)',        toastText === 'Copied!');
  ok('No JS errors',                        errors.length === 0);
  await page.close();
}

// ── [4] Toast disappears after ~2 s ──────────────────────────────────────────
console.log('\n[4] Toast disappears automatically after ~2 s');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnShare');
  await page.waitForTimeout(150);
  ok('toast visible immediately after click', await page.isVisible('#share-toast'));

  // Wait for the 2 s timeout + a small buffer
  await page.waitForTimeout(2200);
  ok('toast hidden after 2.2 s',             !(await page.isVisible('#share-toast')));
  ok('No JS errors',                          errors.length === 0);
  await page.close();
}

// ── [5] Polish toast text after language switch ───────────────────────────────
console.log('\n[5] After switching to PL, toast reads "Skopiowano!"');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // Switch to Polish
  await page.click('#btnLang');
  await page.waitForTimeout(150);

  await page.click('#btnShare');
  await page.waitForTimeout(150);

  const toastText = (await page.textContent('#share-toast')).trim();
  ok('toast visible after click (PL)',       await page.isVisible('#share-toast'));
  ok('toast text is "Skopiowano!" (PL)',     toastText === 'Skopiowano!');
  ok('No JS errors',                         errors.length === 0);
  await page.close();
}

// ── [6] Switch back to EN — toast reverts to "Copied!" ───────────────────────
console.log('\n[6] Switching back to EN → toast reverts to "Copied!"');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnLang');   // EN → PL
  await page.waitForTimeout(150);
  await page.click('#btnLang');   // PL → EN
  await page.waitForTimeout(150);

  await page.click('#btnShare');
  await page.waitForTimeout(150);

  const toastText = (await page.textContent('#share-toast')).trim();
  ok('toast text is "Copied!" after toggling back to EN', toastText === 'Copied!');
  ok('No JS errors',                                      errors.length === 0);
  await page.close();
}

// ── [7] Multiple clicks — toast stays visible and resets timer ────────────────
console.log('\n[7] Multiple rapid clicks keep toast visible and reset the timer');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnShare');
  await page.waitForTimeout(100);
  await page.click('#btnShare');
  await page.waitForTimeout(100);
  await page.click('#btnShare');
  await page.waitForTimeout(150);

  ok('toast still visible after rapid clicks', await page.isVisible('#share-toast'));

  // Wait just under 2 s — toast should still be visible (timer reset on last click)
  await page.waitForTimeout(1800);
  ok('toast still visible 1.9 s after last click', await page.isVisible('#share-toast'));

  await page.waitForTimeout(400);
  ok('toast hidden after ~2.3 s since last click',  !(await page.isVisible('#share-toast')));
  ok('No JS errors',                                errors.length === 0);
  await page.close();
}

// ── [8] Chart still renders after clicking share ─────────────────────────────
console.log('\n[8] Chart still renders correctly after clicking #btnShare');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnShare');
  await page.waitForTimeout(300);

  const svgExists    = await page.$('#chart') !== null;
  const pathExists   = await page.$('#chart path') !== null;
  const todayExists  = await page.$('#chart circle') !== null;

  ok('SVG chart exists after share click',     svgExists);
  ok('analemma path exists',                   pathExists);
  ok('today marker circle exists',             todayExists);
  ok('No JS errors',                           errors.length === 0);
  await page.close();
}

// ── [9] Share button co-exists with info panel ───────────────────────────────
console.log('\n[9] Share button and info panel can both be used');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // Open info panel
  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  ok('info panel opens', await page.isVisible('#about-panel'));

  // Click share while info panel is open
  await page.click('#btnShare');
  await page.waitForTimeout(150);
  ok('toast visible after share click',        await page.isVisible('#share-toast'));
  // Clicking outside the info panel naturally closes it (expected behavior)
  ok('No JS errors',                           errors.length === 0);
  await page.close();
}

// ── [10] Toast not visible before first click ─────────────────────────────────
console.log('\n[10] Toast has no text before first click (no stale content)');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const initialText = (await page.textContent('#share-toast')).trim();
  ok('toast has empty text before first click', initialText === '');
  ok('No JS errors',                            errors.length === 0);
  await page.close();
}

// ── [11] Toast z-index above other elements ───────────────────────────────────
console.log('\n[11] #share-toast has a CSS z-index sufficient to appear above controls');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnShare');
  await page.waitForTimeout(150);

  const zIndex = await page.$eval('#share-toast', el => getComputedStyle(el).zIndex);
  ok('toast z-index ≥ 10', parseInt(zIndex, 10) >= 10);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [12] Theme does not affect toast visibility ───────────────────────────────
console.log('\n[12] Toast appears in both dark and light themes');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // Dark (default)
  await page.click('#btnShare');
  await page.waitForTimeout(150);
  ok('toast visible in dark theme', await page.isVisible('#share-toast'));
  await page.waitForTimeout(2200);

  // Switch to light
  await page.click('#btnTheme');
  await page.waitForTimeout(150);
  await page.click('#btnShare');
  await page.waitForTimeout(150);
  ok('toast visible in light theme', await page.isVisible('#share-toast'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── Summary ───────────────────────────────────────────────────────────────────
await browser.close();
console.log(`\n${'─'.repeat(50)}`);
console.log(`Issue 16 tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
