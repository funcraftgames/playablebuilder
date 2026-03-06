import './styles/game.css';
import MainButton from './components/MainButton.js';
import DiceTray from './components/DiceTray.js';
import ScoreBoard2 from './components/ScoreBoard.js';
import { getSafeArea } from '../shared/safeArea.js';
import logoUrl from './assets/Logo.png';

const BASE_BOARD_SIZE = 300; // board is built at this size, then scaled
const TRAY_HEIGHT = 80;
const BTN_MARGIN  = 100; // distance from bottom to button center

export default class GameScene2 extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene2' });
  }

  preload() {
    this.load.image('logo', logoUrl);
  }

  create() {
    const { width } = this.scale;

    // Gradient background
    this._bgGfx = this.add.graphics();

    // Yellow background panel behind dice tray + button
    this._trayBg = this.add.graphics();

    // Header logo
    this._logo = this.add.image(0, 0, 'logo').setOrigin(0.5, 0);

    // Tagline
    this._tagline = this.add.text(0, 0, 'Connect 4 in a row to win!', {
      fontSize: '16px',
      fontStyle: 'bold',
      fontFamily: 'MuseoSansRounded, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetY: 1, color: '#000000', blur: 3, fill: true },
    }).setOrigin(0.5, 0);

    // Board
    this.scoreBoard = new ScoreBoard2(this, 0, 0, BASE_BOARD_SIZE,
      (winner) => {
        this._rollBtn.setVisible(false);
        this._botLabel.setAlpha(0);
        this._stopBtnBounce();
        // Fade out dice tray and bottom bg
        this.tweens.add({ targets: this.diceTray, alpha: 0, duration: 400 });
        this.tweens.add({ targets: this._trayBg, alpha: 0, duration: 400 });

        // Show result overlay after a short delay
        this.time.delayedCall(600, () => this._showResultOverlay(winner));

        // Auto-redirect to store
        this.time.delayedCall(3000, () => {
          if (typeof window.__openStore === 'function') window.__openStore();
        });
      },
      (_value, worldX, worldY) => {
        this._rollBtn.setVisible(false);
        this.diceTray.flyTo(worldX, worldY, () => {
          this._rollBtn.setLabel('Roll');
          // Bot takes its turn after dice fly animation
          this.time.delayedCall(600, () => this._doBotTurn());
        });
      }
    );

    // Dice tray
    this.diceTray = new DiceTray(
      this, 0, 0, width, TRAY_HEIGHT, 2, (_sel, all) => this.scoreBoard.highlight(all)
    );

    // Re-Roll / Pass button
    this._rerollsLeft = 2;
    this._needsFirstRoll = false; // true when waiting for user's first roll of the turn
    this._rollBtn = new MainButton(this, 0, 0, 'Re-Roll', () => this._onBtnPress());

    // "Opponent is playing" label (hidden by default)
    this._botLabel = this.add.text(0, 0, 'Opponent is playing...', {
      fontSize: '22px',
      fontStyle: 'bold',
      fontFamily: 'MuseoSansRounded, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    // Layout and resize
    this._layout();
    this.scale.on('resize', this._layout, this);

    this._rollCount = 0;

    // Signal preloader to hide
    window.dispatchEvent(new Event('__gameReady'));

    // Auto-roll on start (free, doesn't count)
    this._doRoll(true);
  }

  _onBtnPress() {
    if (this._needsFirstRoll) {
      this._needsFirstRoll = false;
      this._doRoll(true);
    } else if (this._rerollsLeft > 0) {
      this._doRoll();
    } else {
      this._passTurn();
    }
  }

  _doRoll(freeRoll = false) {
    this._stopBtnBounce();
    if (!freeRoll) this._rerollsLeft--;
    this._updateBtnLabel();
    this.diceTray.roll();

    if (window.__gameFixed) {
      this._rollCount++;
      const isDecoy = (this._rollCount % 2 === 0);
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
      this.diceTray.showNumber();
    });
  }

  _passTurn() {
    this._stopBtnBounce();
    this._rollBtn.setVisible(false);
    this.scoreBoard.highlight(null);
    this.tweens.add({ targets: this.diceTray, alpha: 0, duration: 300 });
    this.time.delayedCall(300, () => this._doBotTurn());
  }

  _updateBtnLabel() {
    if (this._rerollsLeft > 0) {
      this._rollBtn.setMode('normal');
      this._rollBtn.setLabel(`Re-Roll ×${this._rerollsLeft}`);
    } else {
      this._rollBtn.setMode('danger');
      this._rollBtn.setLabel('Pass Turn');
    }
  }

  _doBotTurn() {
    if (this.scoreBoard._gameOver) return;

    // Hide button, show bot label
    this._rollBtn.setVisible(false);
    this._botLabel.setAlpha(1);

    this.time.delayedCall(800, () => {
      if (this.scoreBoard._gameOver) return;
      this.scoreBoard.botMove();

      // After bot moves, restore button with "Roll" label (if game not over)
      this.time.delayedCall(500, () => {
        if (this.scoreBoard._gameOver) return;
        this._botLabel.setAlpha(0);
        this._rerollsLeft = 2;
        this._needsFirstRoll = true;
        this.diceTray.setAlpha(1);
        this._rollBtn.setMode('normal');
        this._rollBtn.setLabel('Roll');
        this._rollBtn.setVisible(true);
        this._startBtnBounce();
      });
    });
  }

  _showResultOverlay(winner) {
    const { width, height } = this.scale;
    const isWin = winner === 'player';

    const text = isWin ? 'Good Job!' : 'Too Bad!';
    const color = isWin ? '#ffd234' : '#ef4444';
    const stroke = isWin ? '#8b6914' : '#7a1a1a';

    const label = this.add.text(width / 2, height * 0.55, text, {
      fontSize: '52px',
      fontStyle: 'bold',
      fontFamily: 'MuseoSansRounded, Arial, sans-serif',
      color,
      stroke,
      strokeThickness: 6,
      shadow: { offsetY: 4, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5).setAlpha(0).setScale(0.3);

    this.tweens.add({
      targets: label,
      alpha: 1,
      scaleX: 1, scaleY: 1,
      duration: 500,
      ease: 'Back.Out',
    });

    // Subtle looping pulse
    this.time.delayedCall(500, () => {
      this.tweens.add({
        targets: label,
        scaleX: 1.05, scaleY: 1.05,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    });
  }

  _startBtnBounce() {
    this._stopBtnBounce();
    this._btnBounceTween = this.tweens.add({
      targets: this._rollBtn,
      scaleX: 1.08, scaleY: 1.08,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  _stopBtnBounce() {
    if (this._btnBounceTween) {
      this._btnBounceTween.stop();
      this._btnBounceTween = null;
      this._rollBtn.setScale(1);
    }
  }

  _drawBg(width, height) {
    this._bgGfx.clear();
    this._bgGfx.fillGradientStyle(0x54d4ff, 0x54d4ff, 0x9ba8fc, 0x9ba8fc,  1);
    this._bgGfx.fillRect(0, 0, width, height);
  }

  _layout() {
    const { width, height } = this.scale;
    const safe = getSafeArea();
    this._drawBg(width, height);
    const pad   = 10;
    const topPad = 24;
    const trayY = height - BTN_MARGIN - TRAY_HEIGHT - safe.bottom;

    // ── Header logo ─────────────────────────────────────────────────────────
    const logoNW = this._logo.width;
    const logoNH = this._logo.height;
    const logoAspect = logoNW / logoNH;
    const logoW = Math.min(width * 0.6, (height * 0.1) * logoAspect);
    const logoH = logoW / logoAspect;
    this._logo.setPosition(width / 2, topPad + safe.top);
    this._logo.setDisplaySize(logoW, logoH);

    // ── Tagline ──────────────────────────────────────────────────────────────
    this._tagline.setPosition(width / 2, topPad + safe.top + logoH + 4);

    const headerBottom = topPad + logoH + this._tagline.height + 12;

    // ── Board — centred between header and tray ──────────────────────────────
    const availW = width  - pad * 2;
    const availH = trayY  - headerBottom - pad - 24;
    const boardScale = Math.min(availW, availH) / BASE_BOARD_SIZE;
    const scaledSize = BASE_BOARD_SIZE * boardScale;
    this.scoreBoard.setPosition(
      (width - scaledSize) / 2,
      headerBottom + (availH - scaledSize) / 2
    );
    this.scoreBoard.setScale(boardScale);

    // ── Gradient background from dice tray to bottom ───────────────────────
    this._trayBg.clear();
    const trayBgY = trayY - 16;
    const trayBgH = height - trayY + 16;
    // Left half: #c69446 → #e2b96f
    this._trayBg.fillGradientStyle(0xc69446, 0xe2b96f, 0xc69446, 0xe2b96f, 1);
    this._trayBg.fillRect(0, trayBgY, width / 2, trayBgH);
    // Right half: #e2b96f → #c69446
    this._trayBg.fillGradientStyle(0xe2b96f, 0xc69446, 0xe2b96f, 0xc69446, 1);
    this._trayBg.fillRect(width / 2, trayBgY, width / 2, trayBgH);
    // Top border line
    this._trayBg.fillStyle(0xd2861f, 1);
    this._trayBg.fillRect(0, trayBgY, width, 3);

    // ── DiceTray ─────────────────────────────────────────────────────────────
    this.diceTray.setPosition(0, trayY);
    this.diceTray.resize(width);

    // ── Button & bot label ──────────────────────────────────────────────────
    const btnY = height - BTN_MARGIN / 2 - safe.bottom;
    this._rollBtn.setPosition(width / 2, btnY);
    this._botLabel.setPosition(width / 2, btnY);
  }

  update() {}
}
