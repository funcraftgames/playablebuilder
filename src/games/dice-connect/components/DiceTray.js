import Dice from './Dice.js';

export default class DiceTray extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x - Left edge X
   * @param {number} y - Top edge Y
   * @param {number} width - Tray width
   * @param {number} height - Tray height
   * @param {number} [diceCount=5] - Number of dice in the tray
   */
  constructor(scene, x, y, width, height, diceCount = 5, onSelectionChange = null) {
    super(scene, x, y);

    this._trayWidth = width;
    this._trayHeight = height;
    this._diceCount = diceCount;
    this._onSelectionChange = onSelectionChange;

    // Dice group
    this._diceContainer = scene.add.container(0, 0);
    this.add(this._diceContainer);

    this._dice = [];
    this._spawnDice();
    this._setupDrag();

    scene.add.existing(this);
  }

  /** Show the two-digit number the dice form, on the left of the tray */
  showNumber() {
    const tens  = this._dice[0]?.face ?? 0;
    const units = this._dice[1]?.face ?? 0;
    this._numberLabel.setText(`${tens}${units}`);
    this._numberCircle.setAlpha(1);
    this._numberLabel.setAlpha(1);
  }

  /** Roll non-held dice with new random faces */
  roll() {
    this._numberCircle.setAlpha(0);
    this._numberLabel.setAlpha(0);
    const cy = this._trayHeight / 2;
    const bounceHeight = 60;

    this._dice.forEach((die, i) => {
      if (die.held) return;

      die.reroll();
      die.setVisible(true).setAlpha(1).setScale(1);

      this.scene.tweens.add({
        targets: die,
        y: cy - bounceHeight,
        duration: 180,
        ease: 'Sine.Out',
        delay: i * 60,
        onComplete: () => {
          this.scene.tweens.add({
            targets: die,
            y: cy,
            duration: 550,
            ease: 'Bounce.Out',
          });
        },
      });
    });
  }

  /** Returns an array of the current face values */
  get values() {
    return this._dice.map((d) => d.face);
  }

  /** Returns an array of face values for selected (held) dice */
  get selectedValues() {
    return this._dice.filter((d) => d.held).map((d) => d.face);
  }

  /** Release all dice (clear selection) */
  releaseAll() {
    this._dice.forEach((d) => d.release());
  }

  /** Force specific face values [tens, units] without re-rolling */
  forceValues(tens, units) {
    if (this._dice[0]) this._dice[0].setFace(tens);
    if (this._dice[1]) this._dice[1].setFace(units);
  }

  /**
   * Animate all dice flying toward a world-space coordinate, then call onComplete.
   * Releases all holds after animation.
   */
  flyTo(worldX, worldY, onComplete) {
    this._numberCircle.setAlpha(0);
    this._numberLabel.setAlpha(0);
    const localX = worldX - this.x - this._diceContainer.x;
    const localY = worldY - this.y - this._diceContainer.y;
    let completed = 0;
    const total = this._dice.length;

    this._dice.forEach((die, i) => {
      this.scene.tweens.add({
        targets: die,
        x: localX,
        y: localY,
        scaleX: 0.15,
        scaleY: 0.15,
        alpha: 0,
        duration: 380,
        ease: 'Cubic.In',
        delay: i * 35,
        onComplete: () => {
          completed++;
          if (completed === total) {
            // Hide all dice until next roll
            this._dice.forEach((d) => {
              d.setAlpha(0).setScale(1).setVisible(false).release();
            });
            this._resetPositions();
            if (onComplete) onComplete();
          }
        },
      });
    });
  }

  _spawnDice() {
    this._diceSize = Math.min(this._trayHeight * 0.7, 60) * 1.35;
    const cy = this._trayHeight / 2;
    const step = this._diceSize * 1.2;
    const startX = (this._trayWidth - (this._diceCount - 1) * step) / 2;

    for (let i = 0; i < this._diceCount; i++) {
      const cx = startX + i * step;
      const autoHold = this._diceCount !== 2;
      const die = new Dice(this.scene, cx, cy, this._diceSize, undefined, () => {
        if (this._onSelectionChange) {
          this._onSelectionChange(this.selectedValues, this.values);
        }
      }, autoHold);
      this._diceContainer.add(die);
      this._dice.push(die);
    }

    // Number display — pinned to left edge of tray
    const circleRadius = Math.round(this._trayHeight * 0.28);
    const labelX = circleRadius + 6;
    this._numberCircle = this.scene.add.circle(labelX, cy, circleRadius, 0x3a1200)
      .setStrokeStyle(2, 0x7a3500)
      .setAlpha(0);
    this.add(this._numberCircle);

    this._numberLabel = this.scene.add.text(labelX, cy, '', {
      fontSize:   `${Math.round(this._trayHeight * 0.26)}px`,
      fontStyle:  'bold',
      fontFamily: 'MuseoSansRounded, Arial, sans-serif',
      color:      '#ffffff',
    }).setOrigin(0.5).setAlpha(0);
    this.add(this._numberLabel);
  }

  /** Update tray width on browser resize and reflow dice */
  resize(newWidth) {
    this._trayWidth = newWidth;
    this._resetPositions();
  }

  _resetPositions() {
    const step = this._diceSize * 1.2;
    const startX = (this._trayWidth - (this._diceCount - 1) * step) / 2;
    const cy = this._trayHeight / 2;
    this._dice.forEach((die, i) => {
      die.x = startX + i * step;
      die.y = cy;
    });
    if (this._numberLabel) {
      this._numberCircle.y = cy;
      this._numberLabel.y = cy;
    }
  }

  _animateToPositions() {
    const step = this._diceSize * 1.2;
    const startX = (this._trayWidth - (this._diceCount - 1) * step) / 2;
    const cy = this._trayHeight / 2 ;
    this._dice.forEach((die, i) => {
      this.scene.tweens.add({
        targets: die,
        x: startX + i * step,
        y: cy,
        scaleX: 1, scaleY: 1,
        duration: 180,
        ease: 'Back.Out',
      });
    });
  }

  _setupDrag() {
    if (this._diceCount !== 2) return;

    let draggingDie = null;
    let draggingIdx = -1;
    let startPointerX = 0;
    let startDieX = 0;
    let isDragging = false;
    const THRESHOLD = 6;
    const DOUBLE_TAP_MS = 320;
    const TOGGLE_COOLDOWN_MS = 700;
    const lastTap = new Map();
    const lastToggle = new Map();

    this._dice.forEach((die) => {
      die.hitZone.on('pointerdown', (pointer) => {
        const now = Date.now();
        const currentIdx = this._dice.indexOf(die);

        // Double-tap → lock/unlock die for re-roll
        if (now - (lastTap.get(die) ?? 0) < DOUBLE_TAP_MS) {
          lastTap.set(die, 0);
          // Cooldown prevents accidental re-toggle right after locking
          if (now - (lastToggle.get(die) ?? 0) >= TOGGLE_COOLDOWN_MS) {
            lastToggle.set(die, now);
            // Only one die can be locked at a time — release all others first
            this._dice.forEach(d => { if (d !== die) d.release(); });
            die.toggleHold();
            if (this._onSelectionChange) {
              this._onSelectionChange(this.selectedValues, this.values);
            }
          }
          draggingDie = null;
          return;
        }
        lastTap.set(die, now);

        // Begin potential drag
        draggingIdx = currentIdx;
        draggingDie = die;
        startPointerX = pointer.x;
        this.scene.tweens.killTweensOf(die);
        startDieX = die.x;
        isDragging = false;
      });
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (!draggingDie || !pointer.isDown) return;
      const dx = pointer.x - startPointerX;
      if (!isDragging && Math.abs(dx) < THRESHOLD) return;
      isDragging = true;
      draggingDie.setScale(1.1);
      draggingDie.x = startDieX + dx;
    });

    this.scene.input.on('pointerup', () => {
      if (!draggingDie) return;

      if (isDragging) {
        const other = this._dice[1 - draggingIdx];
        const shouldSwap =
          (draggingIdx === 0 && draggingDie.x > other.x - this._diceSize * 0.5) ||
          (draggingIdx === 1 && draggingDie.x < other.x + this._diceSize * 0.5);

        if (shouldSwap) {
          [this._dice[0], this._dice[1]] = [this._dice[1], this._dice[0]];
        }

        this._animateToPositions();
        this.showNumber();

        if (this._onSelectionChange) {
          this._onSelectionChange(this.selectedValues, this.values);
        }
      }

      draggingDie = null;
      draggingIdx = -1;
      isDragging  = false;
    });
  }
}
