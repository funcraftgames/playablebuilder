import './styles/game.css';
import MainButton from './components/MainButton.js';
import DiceTray from './components/DiceTray.js';
import ScoreBoard from './components/ScoreBoard.js';
import letterTrayBgUrl from './assets/LetterTrayBackground.png';
import { getSafeArea } from '../shared/safeArea.js';


export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('letterTrayBackground', letterTrayBgUrl);
  }

  create() {
    const { width, height } = this.scale;
    const safe = getSafeArea();

    const trayHeight = 100;
    const trayY = height - 200 - safe.bottom;

    // Game title
    this.add.text(width / 2, safe.top + 28, 'DICE YATZY', {
      fontSize: '36px',
      fontFamily: 'MuseoSansRounded, Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffcc00',
      fillGradientType: 1,
      fillGradientColor1: '#fff066',
      fillGradientColor2: '#ff7700',
      stroke: '#3d1500',
      strokeThickness: 7,
      shadow: { offsetX: 0, offsetY: 5, color: '#000000', blur: 0, fill: true },
    }).setOrigin(0.5, 0.5);

    // Scoreboard — scale to fit between title and dice tray
    const boardPad = 10;
    const boardY = safe.top + 62;
    this.scoreBoard = new ScoreBoard(this, boardPad, boardY, width - boardPad * 2,
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

    // Scale board to fill the available vertical space, centered horizontally
    const availH = trayY - 8 - boardY;
    const boardScale = Math.min(1, availH / this.scoreBoard.boardHeight);
    if (boardScale < 1) {
      this.scoreBoard.setScale(boardScale);
      const scaledW = this.scoreBoard.boardWidth * boardScale;
      this.scoreBoard.setX(boardPad + ((width - boardPad * 2) - scaledW) / 2);
    }

    // Dice tray with 5 dice
    this.diceTray = new DiceTray(this, 0, trayY, width, trayHeight, 'letterTrayBackground');

    // Track rolls per turn (0 = not rolled yet, 1-2 = free rerolls, 3 = max)
    this._rollCount = 0;

    // Roll button — centered below the tray
    this._rollBtn = new MainButton(this, width / 2, height - 50 - safe.bottom, 'Roll', () => {
      if (this._rollCount >= 3) return;

      this.scoreBoard.clearPending();
      this.diceTray.roll();
      this._rollCount++;
      this._updateRollButton();

      // Show available scores after dice settle
      this.time.delayedCall(800, () => {
        this.scoreBoard.updateAvailable(this.diceTray.values);
      });
    });

    this._startRollBounce();

    window.dispatchEvent(new Event('__gameReady'));
  }

  _updateRollButton() {
    const btn = this._rollBtn;
    if (this._rollCount === 0) {
      btn.setLabel('Roll');
      btn.setVisible(true);
      this._startRollBounce();
    } else if (this._rollCount === 1) {
      this._stopRollBounce();
      btn.setLabel('Re-Roll ×2');
    } else if (this._rollCount === 2) {
      btn.setLabel('Re-Roll ×1');
    } else {
      btn.setVisible(false);
    }
  }

  _startRollBounce() {
    this._stopRollBounce();
    this._rollBounceTween = this.tweens.add({
      targets: this._rollBtn,
      scaleX: 1.1, scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  _stopRollBounce() {
    if (this._rollBounceTween) {
      this._rollBounceTween.stop();
      this._rollBounceTween = null;
      this._rollBtn.setScale(1);
    }
  }

  update() {}
}
