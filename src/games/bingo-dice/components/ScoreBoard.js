const STAR_CELLS = new Set(['0,0', '0,4', '2,2', '4,0', '4,4']);

// All 2-digit numbers where both digits are 1–6 (36 entries)
function buildNumberPool() {
  const pool = [];
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      pool.push(a * 10 + b);
  return pool;
}

export default class ScoreBoard2 extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} size - Total board width/height (square)
   * @param {function} [onBingo]
   * @param {function} [onMark] - Called with (value) after a cell is marked
   */
  constructor(scene, x, y, size, onBingo, onMark) {
    super(scene, x, y);

    this._cs = size / 5;
    this._cells = [];
    this._onBingo = onBingo;
    this._onMark = onMark;
    this._bingoDone = false;
    this._targetLine = { type: 'row', index: 0 }; // fixed mode always targets this line

    this._build();
    scene.add.existing(this);
  }

  // ── Public ────────────────────────────────────────────────────────────────

  /**
   * Highlight the cell matching the ordered dice combination.
   * @param {number[]} diceValues - [tens, units] — order matters
   */
  highlight(diceValues) {
    const primary = (diceValues && diceValues.length === 2)
      ? diceValues[0] * 10 + diceValues[1]
      : null;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = this._cells[r][c];
        if (cell.value === null || cell.marked) continue;

        const inPrimary = cell.value === primary;
        cell.isPrimary = inPrimary;
        this._setCellStyle(cell, inPrimary ? 'primary' : 'default');
      }
    }
  }

  /** Returns unmarked values from the fixed target line only. */
  getTargetLineValues() {
    return this._getLineCells(this._targetLine.type, this._targetLine.index)
      .filter(c => c.value !== null && !c.marked)
      .map(c => c.value);
  }

  _getLineCells(type, index) {
    if (type === 'row')   return this._cells[index].slice();
    if (type === 'col')   return this._cells.map(r => r[index]);
    if (type === 'diagD') return [0,1,2,3,4].map(i => this._cells[i][i]);
    if (type === 'diagU') return [0,1,2,3,4].map(i => this._cells[i][4-i]);
    return [];
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _build() {
    const cs = this._cs;
    const pool = Phaser.Utils.Array.Shuffle(buildNumberPool());
    let ni = 0;

    for (let r = 0; r < 5; r++) {
      this._cells[r] = [];
      for (let c = 0; c < 5; c++) {
        const cx = c * cs + cs / 2;
        const cy = r * cs + cs / 2;
        const isStar = STAR_CELLS.has(`${r},${c}`);
        const value = isStar ? null : pool[ni++];

        // Shadow circle — only for non-star cells, hidden until primary state
        const shadow = isStar ? null : this.scene.add
          .circle(cx, cy + 6, (cs - 6) / 2, 0x0d5c32)
          .setVisible(false);
        if (shadow) this.add(shadow);

        const bg = this.scene.add
          .circle(cx, cy, (cs - 6) / 2, 0xffffff)
          .setStrokeStyle(3, 0xffde85);
        this.add(bg);

        const label = this.scene.add.text(cx, cy, isStar ? '★' : String(value), {
          fontSize: `${Math.round(cs * 0.38)}px`,
          fontStyle: 'bold',
          fontFamily: 'MuseoSansRounded, Arial, sans-serif',
          color: isStar ? '#e38d20' : '#3c1f59',
        }).setOrigin(0.5);
        this.add(label);

        const cell = { value, marked: isStar, isPrimary: false, bg, label, shadow };
        this._cells[r][c] = cell;

        if (isStar) {
          bg.setFillStyle(0xf9c957);
        } else {
          const row = r, col = c;
          bg.setInteractive({ useHandCursor: true });
          bg.on('pointerdown', () => {
            if (this._cells[row][col].isPrimary) this._doMark(row, col);
          });
        }
      }
    }
  }

  _doMark(r, c) {
    const cell = this._cells[r][c];
    cell.marked = true;
    cell.isPrimary = false;
    this._setCellStyle(cell, 'marked');

    this.scene.tweens.add({
      targets: cell.label,
      scaleX: 1.35, scaleY: 1.35,
      duration: 140,
      yoyo: true,
      ease: 'Sine.InOut',
    });

    const matrix = cell.bg.getWorldTransformMatrix();
    this._emitMarkParticles(matrix.tx, matrix.ty);

    this._checkBingo();
    if (this._onMark) this._onMark(cell.value, matrix.tx, matrix.ty);
  }

  _emitMarkParticles(wx, wy) {
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
      tint: [0xf9c957, 0xff8f00, 0x49bf69, 0xffffff, 0x7ef8a3],
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
      case 'marked':
        if (cell.shadow) cell.shadow.setVisible(false);
        cell.bg.setFillStyle(0xf9c957).setStrokeStyle(3, 0xffde85);
        this.scene.tweens.killTweensOf(cell.label);
        cell.label.setScale(1).setColor('#e38d20').setStroke('#000000', 0).setShadow(0, 0, '#000000', 0, false, false);
        break;
      case 'bingo':
        if (cell.shadow) cell.shadow.setVisible(false);
        cell.bg.setFillStyle(0xff8f00).setStrokeStyle(2, 0xf8ed6c);
        this.scene.tweens.killTweensOf(cell.label);
        cell.label.setScale(1).setColor('#ffffff').setStroke('#000000', 0).setShadow(0, 2, '#000000', 4, false, true);
        break;
    }
  }

  _checkBingo() {
    const m = (r, c) => this._cells[r][c].marked;
    for (let r = 0; r < 5; r++)
      if ([0,1,2,3,4].every(c => m(r, c))) { this._triggerBingo('row', r); return; }
    for (let c = 0; c < 5; c++)
      if ([0,1,2,3,4].every(r => m(r, c))) { this._triggerBingo('col', c); return; }
    if ([0,1,2,3,4].every(i => m(i, i)))   { this._triggerBingo('diagD'); return; }
    if ([0,1,2,3,4].every(i => m(i, 4-i))) { this._triggerBingo('diagU'); return; }
  }

  _triggerBingo(type, index) {
    if (this._bingoDone) return;
    this._bingoDone = true;

    const winning = [];
    if (type === 'row')   for (let c = 0; c < 5; c++) winning.push(this._cells[index][c]);
    if (type === 'col')   for (let r = 0; r < 5; r++) winning.push(this._cells[r][index]);
    if (type === 'diagD') for (let i = 0; i < 5; i++) winning.push(this._cells[i][i]);
    if (type === 'diagU') for (let i = 0; i < 5; i++) winning.push(this._cells[i][4-i]);

    // Sort left-to-right, top-to-bottom so B-I-N-G-O always reads naturally
    winning.sort((a, b) => a.bg.x !== b.bg.x ? a.bg.x - b.bg.x : a.bg.y - b.bg.y);

    // Fade out non-winning cells
    const winningSet = new Set(winning);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) {
        const cell = this._cells[r][c];
        if (!winningSet.has(cell))
          this.scene.tweens.add({ targets: [cell.bg, cell.label], alpha: 0.2, duration: 500 });
      }

    const bingoLetters = ['B', 'I', 'N', 'G', 'O'];
    const cascadeEnd = winning.length * 70;
    winning.forEach((cell, i) => {
      // Cascade: apply bingo style + letter
      this.scene.time.delayedCall(i * 70, () => {
        this._setCellStyle(cell, 'bingo');
        cell.label.setText(bingoLetters[i]);
      });
      // Looping bounce after cascade, staggered per cell
      this.scene.time.delayedCall(cascadeEnd + i * 100, () => {
        this.scene.tweens.add({
          targets: [cell.bg, cell.label],
          scaleX: 1.2, scaleY: 1.2,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      });
    });

    this.scene.time.delayedCall(cascadeEnd, () => this._emitBingoConfetti());

    if (this._onBingo) this._onBingo();
  }

  _emitBingoConfetti() {
    if (!this.scene.textures.exists('__confetti')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff);
      g.fillRect(0, 0, 10, 5);
      g.generateTexture('__confetti', 10, 5);
      g.destroy();
    }

    const { width, height } = this.scene.scale;
    const colors = [0xf9c957, 0xff5252, 0x49bf69, 0x5599ff, 0xff88cc, 0xffffff, 0xff8f00, 0xaa44ff];
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
}
