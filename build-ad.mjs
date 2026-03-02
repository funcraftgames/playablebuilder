/**
 * build-ad.mjs  [game-name]
 * Builds self-contained single-HTML playable ads into dist-ad/.
 *
 * Usage:
 *   node build-ad.mjs              — builds ALL games
 *   node build-ad.mjs bingo-dice   — builds one game
 *
 * Output: dist-ad/<game>.html
 *
 * Steps per game:
 *   1. Run `vite build --config vite.config.ad.js` with GAME env var
 *   2. Read the output HTML from dist-ad/<game>.html
 *   3. Download Google Fonts referenced in the inlined CSS and embed as base64
 *   4. Replace window.top references
 *   5. Overwrite dist-ad/<game>.html with the final processed HTML
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const OUT_DIR = 'dist-ad';

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

    const woff2Re = /url\((['"]?)(https:\/\/[^)'"]+)\1\)\s+format\(['"]?woff2['"]?\)/g;
    const woff2Matches = [...fontCss.matchAll(woff2Re)];

    console.log(`  Embedding ${woff2Matches.length} WOFF2 font file(s)...`);
    for (const wm of woff2Matches) {
      const woff2Url = wm[2];
      console.log(`    ↳ ${woff2Url.substring(0, 70)}...`);
      const base64 = await fetchBase64(woff2Url);
      fontCss = fontCss.replace(woff2Url, `data:font/woff2;base64,${base64}`);
    }

    html = html.replace(match[0], fontCss);
  }

  return html;
}

/**
 * Replace window.top with window so ad validators don't flag it.
 */
function removeWindowTop(html) {
  const before = (html.match(/window\.top/g) ?? []).length;
  const result = html.replaceAll('window.top', 'window');
  console.log(`  Replaced ${before} occurrence(s) of window.top → window`);
  return result;
}

/** Find all game names under src/games/ that have a main.js entry point. */
function discoverGames() {
  return readdirSync('src/games', { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join('src/games', d.name, 'main.js')))
    .map(d => d.name);
}

/** Build a single game and post-process dist-ad/<game>.html in place. */
async function buildGame(game) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ Building ad for "${game}"...`);
  console.log('─'.repeat(60));

  execSync(`GAME=${game} npx vite build --config vite.config.ad.js`, { stdio: 'inherit' });

  const outFile = join(OUT_DIR, `${game}.html`);

  console.log('\n▶ Post-processing: inlining Google Fonts...');
  let html = readFileSync(outFile, 'utf-8');
  html = await inlineGoogleFonts(html);

  console.log('\n▶ Post-processing: removing window.top references...');
  html = removeWindowTop(html);

  writeFileSync(outFile, html, 'utf-8');
  const sizeKb = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
  console.log(`\n✓  ${outFile}  (${sizeKb} KB)`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const arg   = process.argv[2];
const games = arg ? [arg] : discoverGames();

if (games.length === 0) {
  console.error('No games found in src/games/ (each game needs a main.js).');
  process.exit(1);
}

for (const game of games) {
  await buildGame(game);
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`✓  Done — built ${games.length} ad(s): ${games.join(', ')}`);
console.log('═'.repeat(60));
