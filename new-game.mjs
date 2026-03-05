/**
 * new-game.mjs <game-name>
 * Scaffolds a new playable ad game under src/games/<game-name>/
 * and registers dev/build scripts in package.json.
 *
 * Usage:
 *   node new-game.mjs my-new-game
 *   npm run new-game -- my-new-game
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const name = process.argv[2];

if (!name) {
  console.error('Usage: node new-game.mjs <game-name>');
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
  console.error('Game name must be lowercase letters, numbers, and hyphens (e.g. my-game).');
  process.exit(1);
}

const gameDir = join('src', 'games', name);

if (existsSync(gameDir)) {
  console.error(`Game "${name}" already exists at ${gameDir}`);
  process.exit(1);
}

// Convert kebab-case to Title Case for display (e.g. my-game -> My Game)
const title = name.replace(/(^|-)([a-z])/g, (_, __, c) => ' ' + c.toUpperCase()).trim();

// ── Create directories ─────────────────────────────────────────────────────

mkdirSync(join(gameDir, 'assets'), { recursive: true });
mkdirSync(join(gameDir, 'components'), { recursive: true });
mkdirSync(join(gameDir, 'styles'), { recursive: true });

// ── main.js ────────────────────────────────────────────────────────────────

writeFileSync(join(gameDir, 'main.js'), `import Phaser from 'phaser';
import GameScene from './GameScene.js';
import './styles/game.css';

const MAX_TAPS = 8;       // redirect to store after this many taps

const appleStoreUrl  = 'https://apps.apple.com/';
const googlePlayUrl  = 'https://play.google.com/store/apps/';

function getStoreUrl() {
  return /android/i.test(navigator.userAgent) ? googlePlayUrl : appleStoreUrl;
}

function openStore() {
  const url = getStoreUrl();
  /* global mraid */
  if (typeof mraid !== 'undefined' && typeof mraid.open === 'function') {
    mraid.open(url);
  } else {
    window.open(url, '_blank');
  }
}

let tapCount = 0;
let _tapListener = null;

function startTapCounter() {
  _tapListener = () => {
    tapCount++;
    if (MAX_TAPS > 0 && tapCount >= MAX_TAPS) {
      stopTapCounter();
      openStore();
    }
  };
  document.addEventListener('pointerdown', _tapListener);
}

function stopTapCounter() {
  if (_tapListener) {
    document.removeEventListener('pointerdown', _tapListener);
    _tapListener = null;
  }
}

window.__openStore = () => {
  stopTapCounter();
  openStore();
};

function createLoader() {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;background:#1a1a2e;display:flex;' +
    'align-items:center;justify-content:center;z-index:9999;' +
    'transition:opacity 0.35s ease;';
  el.innerHTML =
    '<style>@keyframes __spin{to{transform:rotate(360deg)}}</style>' +
    '<div style="width:52px;height:52px;border-radius:50%;' +
    'border:5px solid rgba(255,255,255,0.15);' +
    'border-top-color:#ffffff;' +
    'animation:__spin 0.75s linear infinite;"></div>';
  document.body.appendChild(el);
  return el;
}

function hideLoader(el) {
  el.style.opacity = '0';
  el.addEventListener('transitionend', () => el.remove(), { once: true });
}

function showFallback() {
  document.body.style.cssText =
    'margin:0;background:#1a1a2e;display:flex;align-items:center;' +
    'justify-content:center;height:100vh;cursor:pointer;';
  document.body.innerHTML =
    '<div style="color:#fff;font-size:28px;text-align:center;' +
    'font-family:Arial,sans-serif;user-select:none;">Tap to Play!</div>';
  document.body.addEventListener('click', openStore, { once: true });
}

async function startGame() {
  const loader = createLoader();

  await document.fonts.ready;

  const css = getComputedStyle(document.documentElement);
  const bgColor = css.getPropertyValue('--game-bg-color').trim() || '#1a1a2e';

  const config = {
    type: Phaser.AUTO,
    backgroundColor: bgColor,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: [GameScene],
    callbacks: {
      postBoot(game) {
        if (game.canvas) {
          game.canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            showFallback();
          });
        }
      },
    },
  };

  window.addEventListener('__gameReady', () => hideLoader(loader), { once: true });

  try {
    new Phaser.Game(config);
    startTapCounter();
  } catch (e) {
    loader.remove();
    showFallback();
  }
}

/* global mraid */
if (typeof mraid !== 'undefined') {
  if (mraid.getState() === 'loading') {
    mraid.addEventListener('ready', startGame);
  } else {
    startGame();
  }
} else {
  startGame();
}
`);

// ── GameScene.js ───────────────────────────────────────────────────────────

writeFileSync(join(gameDir, 'GameScene.js'), `import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load assets here, e.g.:
    // this.load.image('logo', '/src/games/${name}/assets/logo.png');
  }

  create() {
    const { width, height } = this.scale;

    // Example: centered text
    this.add.text(width / 2, height / 2, '${title}', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Signal that the game is ready (hides the loader)
    window.dispatchEvent(new Event('__gameReady'));
  }

  update() {
    // Game loop
  }
}
`);

// ── styles/game.css ────────────────────────────────────────────────────────

writeFileSync(join(gameDir, 'styles', 'game.css'), `:root {
  --game-bg-color: #1a1a2e;
  --font-family-game: 'Arial', sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--game-bg-color);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  min-height: calc(var(--vh, 1vh) * 100);
  margin: 0;
  overflow-x: hidden;
}
`);

// ── <game>.html ────────────────────────────────────────────────────────────

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

// ── package.json scripts ───────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
pkg.scripts[`dev:${name}`] = `node set-index.mjs ${name} && vite`;
pkg.scripts[`build:ad:${name}`] = `node build-ad.mjs ${name}`;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// ── Done ───────────────────────────────────────────────────────────────────

console.log(`
Game "${name}" created successfully!

  src/games/${name}/
    main.js        — entry point (store URLs, tap counter, loader)
    GameScene.js   — Phaser scene
    styles/game.css
    assets/        — put your images/audio here
    components/    — put your game components here
  ${name}.html     — dev HTML entry

Scripts added to package.json:
  npm run dev:${name}
  npm run build:ad:${name}

Update the store URLs in src/games/${name}/main.js before building.
`);
