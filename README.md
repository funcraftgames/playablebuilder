# Playable Builder

A Phaser 3 + Vite workspace for building playable ads. Each game lives in `src/games/<game-name>/` and can be developed locally or exported as a self-contained single-file HTML ad.

---

## Project Structure

```
playablebuilder/
├── src/games/
│   ├── bingo-dice/         # Game source
│   │   ├── main.js         # Entry point (Phaser config, store URL, tap counter)
│   │   ├── GameScene.js    # Main Phaser scene
│   │   ├── safeArea.js     # Safe-area helper
│   │   ├── assets/         # Images, sprites
│   │   ├── components/     # Reusable Phaser game objects
│   │   └── styles/         # CSS for the game
│   ├── dice-yatzy/         # Another game (same structure)
│   └── shared/             # Shared utilities across games
├── bingo-dice.html         # Per-game HTML shell (loads game's main.js)
├── dice-yatzy.html
├── index.html              # Dev convenience entry (set-index.mjs rewrites this)
├── vite.config.js          # Dev/multi-page build config
├── vite.config.ad.js       # Single-file ad build config
├── build-ad.mjs            # Ad export script
└── set-index.mjs           # Dev helper: rewrites index.html to point at a game
```

---

## Prerequisites

```bash
npm install
```

---

## Development

Each game has a dedicated dev script that rewrites `index.html` to point at the chosen game, then starts Vite on `http://localhost:3000`.

```bash
npm run dev:bingo-dice
npm run dev:dice-yatzy
```

> `set-index.mjs` updates the `src` attribute in `index.html` to `/src/games/<game>/main.js`. Commit or stash this change as needed between games.

---

## Creating a New Game

1. Create a folder under `src/games/<your-game>/`.
2. Add a `main.js` entry point (import Phaser, configure scenes, handle store redirect and MRAID).
3. Create a matching HTML shell at the root:

   ```html
   <!-- your-game.html -->
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
       <title>Your Game</title>
       <script>
         function setVh() {
           let vh = window.innerHeight * 0.01;
           document.documentElement.style.setProperty('--vh', `${vh}px`);
         }
         window.addEventListener('resize', setVh);
         window.addEventListener('orientationchange', setVh);
         setVh();
       </script>
     </head>
     <body>
       <script type="module" src="/src/games/your-game/main.js"></script>
     </body>
   </html>
   ```

4. Add dev and build scripts to `package.json`:

   ```json
   "dev:your-game":       "node set-index.mjs your-game && vite",
   "build:ad:your-game":  "node build-ad.mjs your-game"
   ```

5. Add the HTML shell as a Rollup input in `vite.config.js`:

   ```js
   input: {
     'your-game': 'your-game.html',
     // ...existing entries
   }
   ```

---

## Exporting a Playable Ad

The ad build produces a **single self-contained HTML file** in `dist-ad/`. All JS, CSS, images, and fonts are inlined — no external requests at runtime.

### Build one game

```bash
npm run build:ad:bingo-dice
# output: dist-ad/bingo-dice.html
```

### Build all games

```bash
npm run build:ad
# output: dist-ad/<game>.html for every game found in src/games/
```

### What the build does

1. **Vite single-file build** (`vite.config.ad.js`) — bundles everything into one HTML using `vite-plugin-singlefile`. All assets are base64-inlined.
2. **Google Fonts inlining** — any `@import` from `fonts.googleapis.com` is replaced by inline `@font-face` rules with base64-embedded WOFF2 files.
3. **`window.top` replacement** — all `window.top` references are rewritten to `window` so ad validators don't flag sandbox violations.

### Output

```
dist-ad/
├── bingo-dice.html   # ~XxxKB, fully self-contained
└── dice-yatzy.html
```

Upload the `.html` file directly to your ad network.

---

## Game Entry Point Conventions (`main.js`)

Each `main.js` should handle:

| Concern | Notes |
|---|---|
| Store URLs | Apple App Store + Google Play, detected by user-agent |
| Store redirect | Use `mraid.open()` when MRAID is available, otherwise `window.open()` |
| Tap counter | Optional: redirect to store after N taps (`MAX_TAPS`) |
| Phaser config | Scene list, renderer, scale mode, parent element |

---

## Standard Build (non-ad)

For a regular multi-page Vite build (not single-file):

```bash
npm run build
# output: dist/
```

This is useful for hosting the games on a web server for QA, not for ad delivery.
