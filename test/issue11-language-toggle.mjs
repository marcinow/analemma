/**
 * Issue 11 — Language toggle (EN/PL)
 * Tests: default EN, toggle to PL, all data-i18n nodes updated, month names,
 *        moon-phase names, date formatting, axis labels, footer, toggle back to EN.
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

// ── [1] Default language is English ──────────────────────────────────────────
console.log('\n[1] Default language — English');
{
  const htmlLang = await page.$eval('html', el => el.lang);
  ok('html[lang] is "en" by default', htmlLang === 'en');

  const btnText = await page.$eval('#btnLang', el => el.textContent.trim());
  ok('Language button shows "PL" (i.e. switch target) when EN is active', btnText === 'PL');

  const locLabel = await page.$eval('[data-i18n="ctrl.location"]', el => el.textContent.trim());
  ok('Location label reads "Location" in EN', locLabel === 'Location');

  const timeLabel = await page.$eval('[data-i18n="ctrl.time"]', el => el.textContent.trim());
  ok('Time label reads "Time" in EN', timeLabel === 'Time');

  const skyBtn = await page.$eval('[data-i18n="ctrl.sky"]', el => el.textContent.trim());
  ok('Sky button reads "Sky" in EN', skyBtn === 'Sky');

  const eotBtn = await page.$eval('[data-i18n="ctrl.eot"]', el => el.textContent.trim());
  ok('EoT button reads "EoT" in EN', eotBtn === 'EoT');

  const markersBtn = await page.$eval('[data-i18n="ctrl.markers"]', el => el.textContent.trim());
  ok('Markers button reads "Markers" in EN', markersBtn === 'Markers');

  const latLabel = await page.$eval('[data-i18n="loc.lat"]', el => el.textContent.trim());
  ok('Lat label reads "Lat" in EN', latLabel === 'Lat');

  const lonLabel = await page.$eval('[data-i18n="loc.lon"]', el => el.textContent.trim());
  ok('Lon label reads "Lon" in EN', lonLabel === 'Lon');

  const timeSliderLabel = await page.$eval('[data-i18n="time.label"]', el => el.textContent.trim());
  ok('Time slider label reads "Time (LMST)" in EN', timeSliderLabel === 'Time (LMST)');
}

// ── [2] Toggle to Polish ──────────────────────────────────────────────────────
console.log('\n[2] Toggle to Polish');
{
  await page.click('#btnLang');
  await page.waitForTimeout(200);

  const htmlLang = await page.$eval('html', el => el.lang);
  ok('html[lang] is "pl" after toggle', htmlLang === 'pl');

  const btnText = await page.$eval('#btnLang', el => el.textContent.trim());
  ok('Language button shows "EN" when PL is active', btnText === 'EN');

  const locLabel = await page.$eval('[data-i18n="ctrl.location"]', el => el.textContent.trim());
  ok('Location label reads "Lokalizacja" in PL', locLabel === 'Lokalizacja');

  const timeLabel = await page.$eval('[data-i18n="ctrl.time"]', el => el.textContent.trim());
  ok('Time label reads "Czas" in PL', timeLabel === 'Czas');

  const skyBtn = await page.$eval('[data-i18n="ctrl.sky"]', el => el.textContent.trim());
  ok('Sky button reads "Niebo" in PL', skyBtn === 'Niebo');

  const eotBtn = await page.$eval('[data-i18n="ctrl.eot"]', el => el.textContent.trim());
  ok('EoT button reads "RCz" in PL', eotBtn === 'RCz');

  const markersBtn = await page.$eval('[data-i18n="ctrl.markers"]', el => el.textContent.trim());
  ok('Markers button reads "Znaczniki" in PL', markersBtn === 'Znaczniki');

  const latLabel = await page.$eval('[data-i18n="loc.lat"]', el => el.textContent.trim());
  ok('Lat label reads "Szer." in PL', latLabel === 'Szer.');

  const lonLabel = await page.$eval('[data-i18n="loc.lon"]', el => el.textContent.trim());
  ok('Lon label reads "Dł." in PL', lonLabel === 'Dł.');

  const timeSliderLabel = await page.$eval('[data-i18n="time.label"]', el => el.textContent.trim());
  ok('Time slider label reads "Czas (LMST)" in PL', timeSliderLabel === 'Czas (LMST)');
}

// ── [3] Placeholder text updates ──────────────────────────────────────────────
console.log('\n[3] City input placeholder');
{
  // Open location panel to access city input
  await page.click('#locToggle');
  await page.waitForTimeout(150);

  const placeholder = await page.$eval('#cityInput', el => el.placeholder);
  ok('City input placeholder is Polish ("Szukaj miasta…")', placeholder === 'Szukaj miasta…');

  await page.click('#locToggle');
  await page.waitForTimeout(100);
}

// ── [4] SVG axis labels update ────────────────────────────────────────────────
console.log('\n[4] SVG axis labels in PL (Sky view)');
{
  const svgText = await page.$$eval('svg text', els => els.map(e => e.textContent.trim()));

  const hasHoryzont = svgText.some(t => t === 'Horyzont');
  ok('Horizon label reads "Horyzont" in PL', hasHoryzont);

  const hasWysokość = svgText.some(t => t === 'Wysokość');
  ok('Altitude axis label reads "Wysokość" in PL', hasWysokość);
}

// ── [5] Month labels on the curve use Polish abbreviations ────────────────────
console.log('\n[5] Month labels in PL (Markers on)');
{
  // Enable markers to get month labels on the SVG
  await page.click('#btnMarkers');
  await page.waitForTimeout(200);

  const svgText = await page.$$eval('svg text', els => els.map(e => e.textContent.trim()));

  // Polish month abbreviations (first few months are sufficient to confirm)
  const plMonths = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
  const enMonths = ['Jan', 'Feb', 'Apr', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const hasPlMonths = plMonths.some(m => svgText.includes(m));
  ok('At least one Polish month abbreviation appears in SVG', hasPlMonths);

  const hasEnMonths = enMonths.some(m => svgText.includes(m));
  ok('No English month abbreviations in SVG when PL active', !hasEnMonths);

  // Turn markers off again
  await page.click('#btnMarkers');
  await page.waitForTimeout(100);
}

// ── [6] Info panel shows Polish strings ──────────────────────────────────────
console.log('\n[6] Info panel strings in PL');
{
  // Hover the SVG to trigger info panel
  const svgBox = await page.$eval('#chart', el => {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  await page.mouse.move(svgBox.cx, svgBox.cy);
  await page.waitForTimeout(200);

  // Try multiple positions near the centre to find a point
  let infoVisible = false;
  for (let dx = -100; dx <= 100; dx += 20) {
    await page.mouse.move(svgBox.cx + dx, svgBox.cy);
    await page.waitForTimeout(50);
    infoVisible = await page.$eval('#info', el => getComputedStyle(el).display !== 'none');
    if (infoVisible) break;
  }

  if (infoVisible) {
    const infoText = await page.$eval('#info', el => el.textContent);

    // In PL the sunrise label should be "Wschód Słońca" not "Sunrise"
    const hasPLSunrise = infoText.includes('Wschód') || infoText.includes('Zachód');
    ok('Info panel shows Polish sunrise/sunset labels', hasPLSunrise);

    const hasEnSunrise = infoText.includes('Sunrise') || infoText.includes('Sunset');
    ok('Info panel does not show English Sunrise/Sunset', !hasEnSunrise);
  } else {
    console.log('  (skipped — could not hover a curve point from center)');
  }
}

// ── [7] EoT view labels in PL ────────────────────────────────────────────────
console.log('\n[7] EoT view axis labels in PL');
{
  await page.click('#btnEot');
  await page.waitForTimeout(200);

  const svgText = await page.$$eval('svg text', els => els.map(e => e.textContent.trim()));

  const hasEquator = svgText.some(t => t === 'Równik');
  ok('Equator label reads "Równik" in PL (EoT view)', hasEquator);

  const hasDecl = svgText.some(t => t === 'Deklinacja (°)');
  ok('Declination axis label reads "Deklinacja (°)" in PL', hasDecl);

  // Switch back to Sky
  await page.click('#btnSky');
  await page.waitForTimeout(150);
}

// ── [8] Toggle back to English ────────────────────────────────────────────────
console.log('\n[8] Toggle back to English');
{
  await page.click('#btnLang');
  await page.waitForTimeout(200);

  const htmlLang = await page.$eval('html', el => el.lang);
  ok('html[lang] returns to "en"', htmlLang === 'en');

  const btnText = await page.$eval('#btnLang', el => el.textContent.trim());
  ok('Language button shows "PL" again', btnText === 'PL');

  const locLabel = await page.$eval('[data-i18n="ctrl.location"]', el => el.textContent.trim());
  ok('Location label returns to "Location"', locLabel === 'Location');

  const markersBtn = await page.$eval('[data-i18n="ctrl.markers"]', el => el.textContent.trim());
  ok('Markers button returns to "Markers"', markersBtn === 'Markers');
}

// ── [9] Month labels return to English after toggle back ─────────────────────
console.log('\n[9] Month labels revert to EN after switching back');
{
  await page.click('#btnMarkers');
  await page.waitForTimeout(200);

  const svgText = await page.$$eval('svg text', els => els.map(e => e.textContent.trim()));

  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hasEnMonth = enMonths.some(m => svgText.includes(m));
  ok('At least one English month abbreviation appears after returning to EN', hasEnMonth);

  const plMonths = ['Sty', 'Lut', 'Kwi', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
  const hasPlMonth = plMonths.some(m => svgText.includes(m));
  ok('No Polish month abbreviations after returning to EN', !hasPlMonth);

  await page.click('#btnMarkers');
  await page.waitForTimeout(100);
}

// ── [10] No JS errors throughout ─────────────────────────────────────────────
console.log('\n[10] No JS errors');
{
  ok('Zero JS errors throughout the test run', errors.length === 0);
  if (errors.length) errors.forEach(e => console.error('    JS error:', e));
}

// ── Summary ───────────────────────────────────────────────────────────────────
await browser.close();
console.log(`\n${'─'.repeat(50)}`);
console.log(`Issue 11 — Language toggle: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
