/**
 * Issue 15 — Info button + analemma explanation & audio narration
 * Tests: ℹ button opens a dropdown panel with localized explanation text;
 *        audio src matches active language (EN/PL); panel closes on second
 *        click, Esc, or outside click; aria-expanded stays in sync;
 *        language toggle swaps both text and audio src; chart unaffected;
 *        zero JS errors throughout.
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

// ── [1] Initial state — button present, panel hidden ─────────────────────────
console.log('\n[1] Initial state — ℹ button present, panel hidden by default');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  const btnExists = await page.$('#btnInfo') !== null;
  const btnText   = (await page.textContent('#btnInfo')).trim();
  const expanded  = await page.getAttribute('#btnInfo', 'aria-expanded');
  const panelHidden = !(await page.isVisible('#about-panel'));
  const audioEl   = await page.$('#aboutAudio') !== null;

  ok('btnInfo element exists',              btnExists);
  ok('btnInfo text is ℹ',                  btnText === 'ℹ');
  ok('aria-expanded is "false" on load',    expanded === 'false');
  ok('about-panel is hidden on load',       panelHidden);
  ok('aboutAudio element exists',           audioEl);
  ok('No JS errors',                        errors.length === 0);
  await page.close();
}

// ── [2] Click opens panel — EN content and audio src ─────────────────────────
console.log('\n[2] Click ℹ → panel opens with correct EN content and audio src');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnInfo');
  await page.waitForTimeout(150);

  const panelVisible = await page.isVisible('#about-panel');
  const expanded     = await page.getAttribute('#btnInfo', 'aria-expanded');
  const h2Text       = (await page.textContent('#about-panel h2')).trim();
  const bodyText     = (await page.textContent('#about-panel p')).trim();
  const audioSrc     = await page.getAttribute('#aboutAudio', 'src');

  ok('Panel visible after click',              panelVisible);
  ok('aria-expanded is "true" when open',      expanded === 'true');
  ok('h2 is English title',                    h2Text === 'What is an analemma?');
  ok('body text starts with "An analemma"',    bodyText.startsWith('An analemma'));
  ok('body text mentions "equation of time"',  bodyText.includes('equation of time'));
  ok('audio src ends with analemma-en.mp3',    audioSrc?.endsWith('analemma-en.mp3'));
  ok('No JS errors',                           errors.length === 0);
  await page.close();
}

// ── [3] Second click closes panel ────────────────────────────────────────────
console.log('\n[3] Second click on ℹ closes panel');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  ok('Panel open after first click',  await page.isVisible('#about-panel'));

  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  ok('Panel hidden after second click', !(await page.isVisible('#about-panel')));
  ok('aria-expanded "false" after close', await page.getAttribute('#btnInfo', 'aria-expanded') === 'false');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [4] Esc key closes panel ─────────────────────────────────────────────────
console.log('\n[4] Esc key closes panel');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  ok('Panel open before Esc', await page.isVisible('#about-panel'));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  ok('Panel hidden after Esc',           !(await page.isVisible('#about-panel')));
  ok('aria-expanded "false" after Esc',  await page.getAttribute('#btnInfo', 'aria-expanded') === 'false');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [5] Click outside closes panel ───────────────────────────────────────────
console.log('\n[5] Click outside the panel closes it');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  ok('Panel open before outside click', await page.isVisible('#about-panel'));

  // click the chart area — far from the button and panel
  await page.mouse.click(300, 400);
  await page.waitForTimeout(150);
  ok('Panel hidden after outside click',           !(await page.isVisible('#about-panel')));
  ok('aria-expanded "false" after outside click',  await page.getAttribute('#btnInfo', 'aria-expanded') === 'false');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [6] Reopen replays audio (currentTime resets) ────────────────────────────
console.log('\n[6] Reopening panel resets audio to start');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // open
  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  // close
  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  // reopen
  await page.click('#btnInfo');
  await page.waitForTimeout(150);

  const currentTime = await page.$eval('#aboutAudio', el => el.currentTime);
  ok('Panel visible after reopen',          await page.isVisible('#about-panel'));
  ok('audio.currentTime near 0 on reopen', currentTime < 1);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [7] Language switch (EN → PL) updates text and audio src ─────────────────
console.log('\n[7] Language switch EN → PL updates panel text and audio src');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // open panel then switch language
  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  await page.click('#btnLang');
  await page.waitForTimeout(250);

  const h2PL      = (await page.textContent('#about-panel h2')).trim();
  const bodyPL    = (await page.textContent('#about-panel p')).trim();
  const audioSrc  = await page.getAttribute('#aboutAudio', 'src');

  ok('h2 is Polish title after switch',             h2PL === 'Czym jest analemma?');
  ok('body text starts with "Analemma to"',         bodyPL.startsWith('Analemma to'));
  ok('body mentions "równanie czasu"',              bodyPL.includes('równanie czasu'));
  ok('audio src ends with analemma-pl.mp3',         audioSrc?.endsWith('analemma-pl.mp3'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [8] Language switch PL → EN reverts text and audio src ───────────────────
console.log('\n[8] Language switch PL → EN reverts to English content and audio');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  await page.click('#btnLang');   // EN → PL
  await page.waitForTimeout(250);
  await page.click('#btnLang');   // PL → EN
  await page.waitForTimeout(250);

  const h2EN     = (await page.textContent('#about-panel h2')).trim();
  const audioSrc = await page.getAttribute('#aboutAudio', 'src');

  ok('h2 reverts to English after PL→EN',   h2EN === 'What is an analemma?');
  ok('audio src reverts to analemma-en.mp3', audioSrc?.endsWith('analemma-en.mp3'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [9] Language switch stops in-progress audio ───────────────────────────────
console.log('\n[9] Language switch pauses and resets audio');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  // switch language while panel open
  await page.click('#btnLang');
  await page.waitForTimeout(250);

  const isPaused    = await page.$eval('#aboutAudio', el => el.paused);
  const currentTime = await page.$eval('#aboutAudio', el => el.currentTime);

  ok('audio is paused after lang switch',        isPaused);
  ok('audio.currentTime reset to 0 after switch', currentTime === 0);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [10] About panel has native audio controls visible ───────────────────────
console.log('\n[10] Audio element has controls attribute');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnInfo');
  await page.waitForTimeout(150);

  const hasControls = await page.$eval('#aboutAudio', el => el.hasAttribute('controls'));
  const preload     = await page.getAttribute('#aboutAudio', 'preload');

  ok('audio has controls attribute',  hasControls);
  ok('audio preload is "none"',       preload === 'none');
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [11] Panel does not affect chart rendering ────────────────────────────────
console.log('\n[11] Chart renders correctly with panel open');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  await page.click('#btnInfo');
  await page.waitForTimeout(150);

  const svgPath  = await page.$('svg#chart path');
  const todayDot = await page.$('svg#chart circle');

  ok('Chart SVG path present with panel open',  svgPath !== null);
  ok('Today dot present with panel open',        todayDot !== null);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [12] Panel does not interact with pinned-point info panel ─────────────────
console.log('\n[12] About panel co-exists with pinned day info panel');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // pin a point by clicking on the chart
  const { x, y } = await page.evaluate(() => {
    const svg = document.getElementById('chart');
    const ctm = svg.getScreenCTM();
    const p   = _pts[0];
    const svgPt = svg.createSVGPoint();
    svgPt.x = p.sx; svgPt.y = p.sy;
    const s = svgPt.matrixTransform(ctm);
    return { x: s.x, y: s.y };
  });
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);

  const infoPinned = await page.isVisible('#info');
  // now open the about panel
  await page.click('#btnInfo');
  await page.waitForTimeout(150);

  ok('Day info panel still visible after opening about panel', infoPinned);
  ok('About panel also visible',   await page.isVisible('#about-panel'));
  ok('No JS errors', errors.length === 0);
  await page.close();
}

// ── [13] Theme toggle — panel background color differs between themes ─────────
console.log('\n[13] Theme toggle — panel background color differs between dark and light');
{
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(fileUrl);
  await page.waitForTimeout(400);

  // Open panel in dark theme, capture background
  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  const bgDark = await page.$eval('#about-panel', el =>
    getComputedStyle(el).backgroundColor);
  // Clicking theme button is an outside-click → panel closes (correct behavior)
  await page.click('#btnTheme');
  await page.waitForTimeout(200);
  ok('Panel closes when theme button clicked (outside-click)', !(await page.isVisible('#about-panel')));

  // Reopen panel in light theme, capture background
  await page.click('#btnInfo');
  await page.waitForTimeout(150);
  const bgLight = await page.$eval('#about-panel', el =>
    getComputedStyle(el).backgroundColor);

  ok('Panel visible after reopening in light theme', await page.isVisible('#about-panel'));
  ok('Background color differs between dark and light themes', bgDark !== bgLight);
  ok('No JS errors', errors.length === 0);
  await page.close();
}

await browser.close();

console.log(`\n${'─'.repeat(48)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
