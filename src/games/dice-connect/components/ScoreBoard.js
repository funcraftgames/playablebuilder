// All 2-digit numbers where both digits are 1–6 (36 entries)
function buildNumberPool() {
  const pool = [];
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      pool.push(a * 10 + b);
  return pool;
}

const BLUE_CHIP = 0x214db2;
const BLUE_CHIP_BORDER = 0x2a64e9;
const RED_CHIP = 0xef4444;
const RED_CHIP_BORDER = 0xfca5a5;

export default class ScoreBoard2 extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} size - Total board width/height (square)
   * @param {function} [onWin] - Called with ('player' | 'bot') when someone wins
   * @param {function} [onMark] - Called with (value, worldX, worldY) after player marks
   */
  constructor(scene, x, y, size, onWin, onMark) {
    super(scene, x, y);

    this._cs = size / 5;
    this._cells = [];
    this._onWin = onWin;
    this._onMark = onMark;
    this._gameOver = false;
    this._botMoveCount = 0;
    this._targetLine = { type: 'row', index: 0 };

    this._build();
    scene.add.existing(this);
  }

  // ── Public ────────────────────────────────────────────────────────────────

  highlight(diceValues) {
    const primary = (diceValues && diceValues.length === 2)
      ? diceValues[0] * 10 + diceValues[1]
      : null;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = this._cells[r][c];
        if (cell.owner) continue;

        const inPrimary = cell.value === primary;
        cell.isPrimary = inPrimary;
        this._setCellStyle(cell, inPrimary ? 'primary' : 'default');
      }
    }
  }

  getTargetLineValues() {
    return this._getLineCells(this._targetLine.type, this._targetLine.index)
      .filter(c => !c.owner)
      .map(c => c.value);
  }

  /** Bot picks a cell to mark. Returns the marked cell or null. */
  botMove() {
    if (this._gameOver) return null;
    this._botMoveCount++;
    const pick = this._pickBotCell();
    if (!pick) return null;

    this._markCell(pick.r, pick.c, 'bot');
    return pick;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _getLineCells(type, index) {
    if (type === 'row')   return this._cells[index].slice();
    if (type === 'col')   return this._cells.map(r => r[index]);
    if (type === 'diagD') return [0,1,2,3,4].map(i => this._cells[i][i]);
    if (type === 'diagU') return [0,1,2,3,4].map(i => this._cells[i][4-i]);
    return [];
  }

  _build() {
    const cs = this._cs;
    const pool = Phaser.Utils.Array.Shuffle(buildNumberPool());
    let ni = 0;

    for (let r = 0; r < 5; r++) {
      this._cells[r] = [];
      for (let c = 0; c < 5; c++) {
        const cx = c * cs + cs / 2;
        const cy = r * cs + cs / 2;
        const value = pool[ni++];

        // Shadow circle — hidden until primary state
        const shadow = this.scene.add
          .circle(cx, cy + 6, (cs - 6) / 2, 0x0d5c32)
          .setVisible(false);
        this.add(shadow);

        const bg = this.scene.add
          .circle(cx, cy, (cs - 6) / 2, 0xffffff)
          .setStrokeStyle(3, 0xffde85);
        this.add(bg);

        const label = this.scene.add.text(cx, cy, String(value), {
          fontSize: `${Math.round(cs * 0.38)}px`,
          fontStyle: 'bold',
          fontFamily: 'MuseoSansRounded, Arial, sans-serif',
          color: '#3c1f59',
        }).setOrigin(0.5);
        this.add(label);

        // Chip overlay (hidden until marked)
        const chip = this.scene.add
          .circle(cx, cy, (cs - 6) / 2, BLUE_CHIP)
          .setStrokeStyle(3, BLUE_CHIP_BORDER)
          .setAlpha(0)
          .setScale(0);
        this.add(chip);

        const chipLabel = this.scene.add.text(cx, cy, '', {
          fontSize: `${Math.round(cs * 0.38)}px`,
          fontStyle: 'bold',
          fontFamily: 'MuseoSansRounded, Arial, sans-serif',
          color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0).setScale(0);
        this.add(chipLabel);

        const cell = {
          r, c, value,
          owner: null,   // null | 'player' | 'bot'
          isPrimary: false,
          bg, label, shadow, chip, chipLabel,
        };
        this._cells[r][c] = cell;

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
          if (cell.isPrimary && !cell.owner && !this._gameOver) {
            this._markCell(r, c, 'player');
            const matrix = cell.bg.getWorldTransformMatrix();
            if (this._onMark) this._onMark(cell.value, matrix.tx, matrix.ty);
          }
        });
      }
    }
  }

  _markCell(r, c, owner) {
    const cell = this._cells[r][c];
    cell.owner = owner;
    cell.isPrimary = false;

    const isPlayer = owner === 'player';
    const chipColor = isPlayer ? BLUE_CHIP : RED_CHIP;
    const chipBorder = isPlayer ? BLUE_CHIP_BORDER : RED_CHIP_BORDER;

    // Reset unmarked cells back to default
    if (isPlayer) {
      for (let ri = 0; ri < 5; ri++)
        for (let ci = 0; ci < 5; ci++) {
          const other = this._cells[ri][ci];
          if (!other.owner && other.isPrimary) {
            other.isPrimary = false;
            this._setCellStyle(other, 'default');
          }
        }
    }

    // Animate chip appearing
    cell.chip.setFillStyle(chipColor).setStrokeStyle(3, chipBorder);
    cell.chipLabel.setText(String(cell.value));

    this.scene.tweens.add({
      targets: [cell.chip, cell.chipLabel],
      alpha: 1,
      scaleX: 1, scaleY: 1,
      duration: 300,
      ease: 'Back.Out',
    });

    // Hide the original label behind the chip
    this.scene.tweens.add({
      targets: cell.label,
      alpha: 0,
      duration: 150,
    });

    if (cell.shadow) cell.shadow.setVisible(false);

    this._emitMarkParticles(cell.bg, isPlayer ? [0x3b82f6, 0x93c5fd, 0xdbeafe, 0xffffff] : [0xef4444, 0xfca5a5, 0xfee2e2, 0xffffff]);

    this._checkWin(owner);
  }

  _emitMarkParticles(bgObj, tintColors) {
    const matrix = bgObj.getWorldTransformMatrix();
    const wx = matrix.tx;
    const wy = matrix.ty;

    if (!this.scene.textures.exists('__particle')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff);
      g.fillCircle(6, 6, 6);
      g.generateTexture('__particle', 12, 12);
      g.destroy();
    }
    const emitter = this.scene.add.particles(wx, wy, '__particle', {
      speed: { min: 80, max: 240 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 900,
      gravityY: 600,
      tint: tintColors,
      emitting: false,
    });
    emitter.explode(20);
    this.scene.time.delayedCall(1100, () => emitter.destroy());
  }

  _setCellStyle(cell, state) {
    switch (state) {
      case 'default':
        if (cell.shadow) cell.shadow.setVisible(false);
        cell.bg.setFillStyle(0xffffff).setStrokeStyle(3, 0xffde85);
        this.scene.tweens.killTweensOf(cell.label);
        cell.label.setScale(1).setColor('#3c1f59').setStroke('#000000', 0).setShadow(0, 0, '#000000', 0, false, false);
        break;
      case 'primary':
        if (cell.shadow) cell.shadow.setVisible(true);
        cell.bg.setFillStyle(0x49bf69).setStrokeStyle(2, 0x7ef8a3);
        cell.label.setColor('#ffffff').setStroke('#000000', 3).setShadow(0, 2, '#000000', 4, false, true);
        this.scene.tweens.killTweensOf(cell.label);
        this.scene.tweens.add({
          targets: cell.label,
          scaleX: 1.3, scaleY: 1.3,
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
        break;
    }
  }

  // ── Win detection (4 in a row) ────────────────────────────────────────────

  _checkWin(owner) {
    const lines = this._getAllLines();
    for (const line of lines) {
      if (this._hasConsecutive(line, owner, 4)) {
        this._triggerWin(owner, line);
        return;
      }
    }
  }

  _getAllLines() {
    const lines = [];
    // Rows
    for (let r = 0; r < 5; r++)
      lines.push([0,1,2,3,4].map(c => this._cells[r][c]));
    // Columns
    for (let c = 0; c < 5; c++)
      lines.push([0,1,2,3,4].map(r => this._cells[r][c]));
    // Main diagonals (length 5)
    lines.push([0,1,2,3,4].map(i => this._cells[i][i]));
    lines.push([0,1,2,3,4].map(i => this._cells[i][4-i]));
    // Off-diagonals (length 4) — top-left to bottom-right
    lines.push([0,1,2,3].map(i => this._cells[i][i+1]));
    lines.push([0,1,2,3].map(i => this._cells[i+1][i]));
    // Off-diagonals (length 4) — top-right to bottom-left
    lines.push([0,1,2,3].map(i => this._cells[i][3-i]));
    lines.push([0,1,2,3].map(i => this._cells[i+1][4-i]));
    return lines;
  }

  /** Check if a line has N consecutive cells owned by `owner` */
  _hasConsecutive(line, owner, n) {
    let count = 0;
    for (const cell of line) {
      if (cell.owner === owner) {
        count++;
        if (count >= n) return true;
      } else {
        count = 0;
      }
    }
    return false;
  }

  /** Find which 4 consecutive cells form the winning run */
  _getWinningCells(line, owner) {
    let count = 0;
    let start = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i].owner === owner) {
        count++;
        if (count >= 4) return line.slice(i - 3, i + 1);
      } else {
        count = 0;
      }
    }
    return [];
  }

  _triggerWin(owner, winningLine) {
    if (this._gameOver) return;
    this._gameOver = true;

    const winners = this._getWinningCells(winningLine, owner);
    const winnerSet = new Set(winners);

    // Fade out non-winning cells
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) {
        const cell = this._cells[r][c];
        if (!winnerSet.has(cell)) {
          const targets = [cell.bg, cell.label];
          if (cell.owner) targets.push(cell.chip, cell.chipLabel);
          this.scene.tweens.add({ targets, alpha: 0.2, duration: 500 });
        }
      }

    // Animate winning chips — delay past the 300ms chip scale-in tween
    const bounceDelay = 350;
    winners.forEach((cell, i) => {
      this.scene.time.delayedCall(bounceDelay + i * 100, () => {
        this.scene.tweens.killTweensOf(cell.chip);
        this.scene.tweens.killTweensOf(cell.chipLabel);
        cell.chip.setScale(1);
        cell.chipLabel.setScale(1);
        this.scene.tweens.add({
          targets: [cell.chip, cell.chipLabel],
          scaleX: 1.25, scaleY: 1.25,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      });
    });

    const cascadeEnd = bounceDelay + winners.length * 100 + 200;
    this.scene.time.delayedCall(cascadeEnd, () => this._emitWinConfetti());

    if (this._onWin) this._onWin(owner);
  }

  _emitWinConfetti() {
    if (!this.scene.textures.exists('__confetti')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff);
      g.fillRect(0, 0, 10, 5);
      g.generateTexture('__confetti', 10, 5);
      g.destroy();
    }

    const { width, height } = this.scene.scale;
    const colors = [0x3b82f6, 0xef4444, 0xf9c957, 0xff5252, 0x49bf69, 0x5599ff, 0xff88cc, 0xffffff];
    const xPositions = [0.1, 0.3, 0.5, 0.7, 0.9].map(t => t * width);

    xPositions.forEach(x => {
      const emitter = this.scene.add.particles(x, height, '__confetti', {
        speed: { min: 250, max: 550 },
        angle: { min: -110, max: -70 },
        scale: { start: 1, end: 0.6 },
        alpha: { start: 1, end: 0 },
        lifespan: 2200,
        gravityY: 450,
        rotate: { min: 0, max: 360 },
        tint: colors,
        quantity: 3,
        frequency: 40,
      });

      this.scene.time.delayedCall(900, () => {
        emitter.stop();
        this.scene.time.delayedCall(2200, () => emitter.destroy());
      });
    });
  }

  // ── Bot AI ────────────────────────────────────────────────────────────────

  _pickBotCell() {
    const empty = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (!this._cells[r][c].owner) empty.push({ r, c });

    if (empty.length === 0) return null;

    // 1. Check if bot can win (3 in a row → place 4th)
    const botWin = this._findThreat('bot', 3);
    if (botWin) return botWin;

    // Only start blocking/extending after 4 rounds
    if (this._botMoveCount >= 4) {
      // 2. Block player (2 in a row → place 3rd to disrupt)
      const playerThreat = this._findThreat('player', 2);
      if (playerThreat) return playerThreat;

      // 3. Extend bot's own line (2 in a row → place 3rd)
      const botExtend = this._findThreat('bot', 2);
      if (botExtend) return botExtend;
    }

    // 4. Random from remaining
    return Phaser.Utils.Array.GetRandom(empty);
  }

  /** Find an empty cell that would extend `owner`'s consecutive count past `count` */
  _findThreat(owner, count) {
    const lines = this._getAllLines();
    for (const line of lines) {
      // Slide a window of (count+1) over the line, looking for `count` owned + 1 empty
      for (let start = 0; start <= line.length - (count + 1); start++) {
        const window = line.slice(start, start + count + 1);
        const owned = window.filter(c => c.owner === owner).length;
        const empties = window.filter(c => !c.owner);
        // Must also ensure no opponent cells in the window
        const opponent = window.filter(c => c.owner && c.owner !== owner).length;
        if (owned === count && empties.length === 1 && opponent === 0) {
          return { r: empties[0].r, c: empties[0].c };
        }
      }
    }
    return null;
  }
}
