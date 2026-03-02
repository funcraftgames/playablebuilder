import './styles/game.css';
import MainButton from './components/MainButton.js';
import DiceTray from './components/DiceTray.js';
import ScoreBoard from './components/ScoreBoard.js';
import GemShopPopup from './components/GemShopPopup.js';
import letterTrayBgUrl from './assets/LetterTrayBackground.png';

const css = getComputedStyle(document.documentElement);
const colorTitle    = css.getPropertyValue('--color-title').trim();
const colorSubtitle = css.getPropertyValue('--color-subtitle').trim();
const fontFamily    = css.getPropertyValue('--font-family-game').trim();

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('letterTrayBackground', letterTrayBgUrl);
  }

  create() {
    const { width, height } = this.scale;

    const trayHeight = 100;
    const trayY = height - 200;

    // Scoreboard — top of screen, full width two-column layout
    const boardPad = 10;
    this.scoreBoard = new ScoreBoard(this, boardPad, 10, width - boardPad * 2,
      (key, pts) => {
        console.log(`Scored ${key}: ${pts}`);
        // New turn — reset roll count + button
        this._rollCount = 0;
        this._updateRollButton();
      },
      'Player 1',
      (worldX, worldY, done) => {
        this.diceTray.flyTo(worldX, worldY, done);
      }
    );

    // Dice tray with 5 dice
    this.diceTray = new DiceTray(this, 0, trayY, width, trayHeight, 'letterTrayBackground');

    // Track rolls per turn (0 = not rolled yet, 1-2 = free rerolls, 3+ = gem)
    this._rollCount = 0;

    // Roll button — centered below the tray
    this._rollBtn = new MainButton(this, width / 2, height - 50, 'Roll', () => {
      const isGem = this._rollCount >= 3;
      if (isGem) {
        if (this.scoreBoard.gems < 10) {
          new GemShopPopup(
            this,
            (gems) => this.scoreBoard.setGems(this.scoreBoard.gems + gems),
            null
          );
          return;
        }
        this.scoreBoard.spendGems(10);
        this.scoreBoard.addPenalty(10);
      }

      this.scoreBoard.clearPending();
      this.diceTray.roll();
      this._rollCount++;
      this._updateRollButton();

      // Show available scores after dice settle
      this.time.delayedCall(800, () => {
        this.scoreBoard.updateAvailable(this.diceTray.values);
      });
    });

    window.dispatchEvent(new Event('__gameReady'));
  }

  _updateRollButton() {
    const btn = this._rollBtn;
    if (this._rollCount === 0) {
      btn.setLabel('Roll');
      btn.setMode('normal');
    } else if (this._rollCount === 1) {
      btn.setLabel('Re-Roll ×2');
      btn.setMode('normal');
    } else if (this._rollCount === 2) {
      btn.setLabel('Re-Roll ×1');
      btn.setMode('normal');
    } else {
      btn.setLabel('Re-Roll 💎 10');
      btn.setMode('gem');
    }
  }

  update() {}
}
