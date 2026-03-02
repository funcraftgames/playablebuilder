/**
 * build-ad.mjs  <game-name>
 * Builds a self-contained single-HTML playable ad for the given game.
 *
 * Usage:  node build-ad.mjs bingo-dice
 * Output: ads/bingo-dice.html
 *
 * Steps:
 *   1. Run `vite build --config vite.config.ad.js` with GAME env var
 *   2. Read the output HTML
 *   3. Download Google Fonts referenced in the inlined CSS and embed as base64
 *   4. Replace window.top references
 *   5. Write the final HTML to ads/<game>.html
 */

import { execSync } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const GAME = process.argv[2];
if (!GAME) {
  console.error('Usage: node build-ad.mjs <game-name>  (e.g. node build-ad.mjs bingo-dice)');
  process.exit(1);
}

const OUT_DIR   = 'dist-ad';
const OUT_FILE  = join(OUT_DIR, 'index.html');
const ADS_DIR   = 'ads';
const FINAL_FILE = join(ADS_DIR, `${GAME}.html`);

// Chrome UA so Google Fonts returns WOFF2 format
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchText(url, headers = {}) {
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  return resp.text();
}

async function fetchBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  return buf.toString('base64');
}

/**
 * Find every Google Fonts @import in the HTML, download the font CSS,
 * download each WOFF2 file, and replace with inline base64 @font-face rules.
 */
async function inlineGoogleFonts(html) {
  // Handles minified (@import"URL") and standard (@import url('URL')) forms.
  // The URL can contain semicolons (e.g. in axis ranges), so we capture up to
  // the closing quote/paren rather than stopping at ";".
  const importRe = /@import\s*(?:url\(['"]?|["'])(https:\/\/fonts\.googleapis\.com[^"')]+)['"]?\)?[^;]*;/g;
  const matches = [...html.matchAll(importRe)];

  if (matches.length === 0) {
    console.log('  No Google Fonts imports found — skipping font inlining.');
    return html;
  }

  for (const match of matches) {
    const apiUrl = match[1];
    console.log(`  Fetching font CSS: ${apiUrl.substring(0, 80)}...`);

    let fontCss = await fetchText(apiUrl, { 'User-Agent': BROWSER_UA });

    // Find all WOFF2 src URLs: url(https://...) format('woff2')
    const woff2Re = /url\((['"]?)(https:\/\/[^)'"]+)\1\)\s+format\(['"]?woff2['"]?\)/g;
    const woff2Matches = [...fontCss.matchAll(woff2Re)];

    console.log(`  Embedding ${woff2Matches.length} WOFF2 font file(s)...`);
    for (const wm of woff2Matches) {
      const woff2Url = wm[2];
      console.log(`    ↳ ${woff2Url.substring(0, 70)}...`);
      const base64 = await fetchBase64(woff2Url);
      fontCss = fontCss.replace(woff2Url, `data:font/woff2;base64,${base64}`);
    }

    // Replace the @import with the inlined @font-face CSS
    html = html.replace(match[0], fontCss);
  }

  return html;
}

/**
 * Replace window.top with window so ad validators don't flag it.
 * Phaser uses window.top for input listeners but falls back safely when
 * running inside an iframe — replacing with window is equivalent at top level.
 */
function removeWindowTop(html) {
  const before = (html.match(/window\.top/g) ?? []).length;
  const result = html.replaceAll('window.top', 'window');
  console.log(`  Replaced ${before} occurrence(s) of window.top → window`);
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`▶ Building ad for "${GAME}" with Vite...`);
execSync(`GAME=${GAME} npx vite build --config vite.config.ad.js`, { stdio: 'inherit' });

console.log('\n▶ Post-processing: inlining Google Fonts...');
let html = readFileSync(OUT_FILE, 'utf-8');
html = await inlineGoogleFonts(html);

console.log('\n▶ Post-processing: removing window.top references...');
html = removeWindowTop(html);

mkdirSync(ADS_DIR, { recursive: true });
writeFileSync(FINAL_FILE, html, 'utf-8');
const sizeKb = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
console.log(`\n✓ Ad written to ${FINAL_FILE} (${sizeKb} KB)`);
