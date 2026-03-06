/**
 * clone-game.mjs <source-game> <new-game>
 * Clones an existing game under src/games/<source-game>/
 * to a new game under src/games/<new-game>/
 * and registers dev/build scripts in package.json.
 *
 * Usage:
 *   node clone-game.mjs bingo-dice my-new-game
 *   npm run clone-game -- bingo-dice my-new-game
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, relative } from 'path';

const source = process.argv[2];
const name = process.argv[3];

if (!source || !name) {
  console.error('Usage: node clone-game.mjs <source-game> <new-game>');
  process.exit(1);
}

const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

if (!namePattern.test(name)) {
  console.error('Game name must be lowercase letters, numbers, and hyphens (e.g. my-game).');
  process.exit(1);
}

const sourceDir = join('src', 'games', source);
const destDir = join('src', 'games', name);

if (!existsSync(sourceDir)) {
  console.error(`Source game "${source}" not found at ${sourceDir}`);
  process.exit(1);
}

if (existsSync(destDir)) {
  console.error(`Game "${name}" already exists at ${destDir}`);
  process.exit(1);
}

// Convert kebab-case to Title Case for display (e.g. my-game -> My Game)
const title = name.replace(/(^|-)([a-z])/g, (_, __, c) => ' ' + c.toUpperCase()).trim();

// Text file extensions that should have path references updated
const textExtensions = new Set(['.js', '.css', '.html', '.json', '.mjs', '.ts', '.jsx', '.tsx']);

function isTextFile(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  return textExtensions.has(ext);
}

// Recursively copy a directory, replacing source references in text files
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);

    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (isTextFile(srcPath)) {
      let content = readFileSync(srcPath, 'utf-8');
      // Replace asset/path references from source game to new game
      content = content.replaceAll(`/src/games/${source}/`, `/src/games/${name}/`);
      content = content.replaceAll(`src/games/${source}/`, `src/games/${name}/`);
      writeFileSync(destPath, content);
    } else {
      // Binary files (images, fonts, etc.) — copy as-is
      copyFileSync(srcPath, destPath);
    }
  }
}

// ── Clone the game directory ────────────────────────────────────────────────

copyDir(sourceDir, destDir);

// ── Create <game>.html (clone from source html if it exists, otherwise scaffold) ──

const sourceHtml = `${source}.html`;
if (existsSync(sourceHtml)) {
  let html = readFileSync(sourceHtml, 'utf-8');
  html = html.replaceAll(`/src/games/${source}/`, `/src/games/${name}/`);
  html = html.replaceAll(`src/games/${source}/`, `src/games/${name}/`);
  // Update the <title> tag
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  writeFileSync(`${name}.html`, html);
} else {
  writeFileSync(`${name}.html`, `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${title}</title>

    <!-- Mobile viewport height fix -->
    <script>
      function setVh() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', \`\${vh}px\`);
      }
      window.addEventListener('resize', setVh);
      window.addEventListener('orientationchange', setVh);
      setVh();
    </script>

  </head>
  <body>
    <script type="module" src="/src/games/${name}/main.js"></script>
  </body>
</html>
`);
}

// ── package.json scripts ────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
pkg.scripts[`dev:${name}`] = `node set-index.mjs ${name} && vite`;
pkg.scripts[`build:ad:${name}`] = `node build-ad.mjs ${name}`;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// ── Done ────────────────────────────────────────────────────────────────────

console.log(`
Game "${name}" cloned from "${source}" successfully!

  src/games/${name}/    (copied from src/games/${source}/)
  ${name}.html          (dev HTML entry)

Scripts added to package.json:
  npm run dev:${name}
  npm run build:ad:${name}
`);
