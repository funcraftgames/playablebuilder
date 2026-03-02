import Phaser from 'phaser';
import GameScene2 from './scenes/GameScene2.js';
import './styles/main2.css';

const MAX_TAPS = 0;       // redirect to store after this many taps
const GAME_FIXED = true;   // when true, dice always roll a matchable board value

const appleStoreUrl = 'https://apps.apple.com/us/app/bingo-dice/id6747049399';
const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.funcraft.bingodice';

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

// Tap counter — redirect after MAX_TAPS interactions
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

// Expose so GameScene2 can call it (bingo path — 0 taps needed)
window.__openStore = () => {
  stopTapCounter();
  openStore();
};

function showFallback() {
  document.body.style.cssText =
    'margin:0;background:#30053c;display:flex;align-items:center;' +
    'justify-content:center;height:100vh;cursor:pointer;';
  document.body.innerHTML =
    '<div style="color:#fff;font-size:28px;text-align:center;' +
    'font-family:Arial,sans-serif;user-select:none;">Tap to Play!</div>';
  document.body.addEventListener('click', openStore, { once: true });
}

async function startGame() {
  await document.fonts.ready;

  const css = getComputedStyle(document.documentElement);
  const bgColor = css.getPropertyValue('--game-bg-color').trim() || '#30053c';

  const config = {
    type: Phaser.AUTO,
    backgroundColor: bgColor,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [GameScene2],
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

  try {
    window.__gameFixed = GAME_FIXED;
    new Phaser.Game(config);
    startTapCounter();
  } catch (e) {
    showFallback();
  }
}

// MRAID v2.0 initialization — wait for ready before starting
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
