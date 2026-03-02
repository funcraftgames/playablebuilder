import '../styles/main2.css';
import MainButton from '../components/MainButton.js';
import DiceTray from '../components/DiceTray.js';
import ScoreBoard2 from '../components/ScoreBoard2.js';
import bingoDiceLogoUrl from '../assets/BingoDiceLogo.png';
import letterTrayBgUrl from '../assets/LetterTrayBackground.png';

const BASE_BOARD_SIZE = 300; // board is built at this size, then scaled
const TRAY_HEIGHT = 100;
const BTN_MARGIN  = 150; // distance from bottom to button center

export default class GameScene2 extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene2' });
  }

  preload() {
    this.load.image('letterTrayBackground', letterTrayBgUrl);
    this.load.image('bingoDiceLogo', bingoDiceLogoUrl);
  }

  create() {
    const { width } = this.scale;

    // Gradient background
    this._bgGfx = this.add.graphics();

    // Header logo
    this._logo = this.add.image(0, 0, 'bingoDiceLogo').setOrigin(0.5, 0);

    // Bingo board — built at BASE_BOARD_SIZE, scaled dynamically
    this.scoreBoard = new ScoreBoard2(this, 0, 0, BASE_BOARD_SIZE,
      () => {
        this._rollBtn.setVisible(false);
        this.time.delayedCall(1500, () => {
          if (typeof window.__openStore === 'function') window.__openStore();
        });
      },
      (_value, worldX, worldY) => {
        this.diceTray.flyTo(worldX, worldY, () => this._rollBtn.setLabel('Roll'));
      }
    );

    // Dice tray
    this.diceTray = new DiceTray(
      this, 0, 0, width, TRAY_HEIGHT, 'letterTrayBackground', 2,
      (_sel, all) => this.scoreBoard.highlight(all)
    );

    // Re-Roll button
    this._rollBtn = new MainButton(this, 0, 0, 'Re-Roll', () => this._doRoll());

    // Layout and resize
    this._layout();
    this.scale.on('resize', this._layout, this);

    this._rollCount = 0;

    // Signal preloader to hide
    window.dispatchEvent(new Event('__gameReady'));

    // Auto-roll on start
    this._doRoll();
  }

  _doRoll() {
    this._rollBtn.setLabel('Re-Roll');
    this.diceTray.roll();

    if (window.__gameFixed) {
      this._rollCount++;
      const isDecoy = (this._rollCount % 2 === 0); // alternates: fixed, free, fixed, free…
      if (!isDecoy) {
        const available = this.scoreBoard.getTargetLineValues();
        if (available.length > 0) {
          const pick = Phaser.Utils.Array.GetRandom(available);
          this.diceTray.forceValues(Math.floor(pick / 10), pick % 10);
        }
      }
    }

    this.time.delayedCall(800, () => {
      this.scoreBoard.highlight(this.diceTray.values);
    });
  }

  _drawBg(width, height) {
    this._bgGfx.clear();
    this._bgGfx.fillGradientStyle(0x55087a, 0x55087a, 0x1a0230, 0x1a0230,  1);
    this._bgGfx.fillRect(0, 0, width, height);
  }

  _layout() {
    const { width, height } = this.scale;
    this._drawBg(width, height);
    const pad   = 10;
    const trayY = height - BTN_MARGIN - TRAY_HEIGHT;

    // ── Header logo ─────────────────────────────────────────────────────────
    const logoNW = this._logo.width;
    const logoNH = this._logo.height;
    const logoAspect = logoNW / logoNH;
    const logoW = Math.min(width * 0.6, (height * 0.1) * logoAspect);
    const logoH = logoW / logoAspect;
    this._logo.setPosition(width / 2, pad);
    this._logo.setDisplaySize(logoW, logoH);

    const headerBottom = pad + logoH + pad;

    // ── Board — centred between header and tray ──────────────────────────────
    const availW = width  - pad * 2;
    const availH = trayY  - headerBottom - pad - 24; // 24px bottom margin under board
    const boardScale = Math.min(availW, availH) / BASE_BOARD_SIZE;
    const scaledSize = BASE_BOARD_SIZE * boardScale;
    this.scoreBoard.setPosition(
      (width - scaledSize) / 2,
      headerBottom + (availH - scaledSize) / 2
    );
    this.scoreBoard.setScale(boardScale);

    // ── DiceTray ─────────────────────────────────────────────────────────────
    this.diceTray.setPosition(0, trayY);
    this.diceTray.resize(width);

    // ── Button ───────────────────────────────────────────────────────────────
    this._rollBtn.setPosition(width / 2, height - BTN_MARGIN / 2);
  }

  update() {}
}
