// GridRow — one row of the board grid.
// Row N (1–6) has N cells. Each cell can show a mini card graphic.
// Multiple different values can occupy the same row (each as a separate "set").
// No Phaser import — global via main.js bundle.

const CELL_W = 46;
const CELL_H = 64;
const CELL_GAP = 8;
const CELL_R = 5;

const LABELS = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' };
const SUIT_INFO = {
  's': { symbol: '♠', color: '#111111' },
  'h': { symbol: '♥', color: '#cc2222' },
  'd': { symbol: '♦', color: '#cc2222' },
  'c': { symbol: '♣', color: '#111111' },
};

export default class GridRow extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x  top-left x of this row
   * @param {number} y  top-left y of this row
   * @param {number} rowNum  1–6 (determines number of cells)
   * @param {number} maxWidth  available width for row
   */
  constructor(scene, x, y, rowNum, maxWidth) {
    super(scene, x, y);

    this._rowNum = rowNum;
    this._maxWidth = maxWidth;
    this._sets = {};     // value → array of { slotIndex, suit }
    this._cellPositions = [];


    // Empty cell outlines
    this._cellGfx = scene.add.graphics();
    this.add(this._cellGfx);

    this._buildCells();

    // Card graphics layer (above cells)
    this._cardLayer = scene.add.container(0, 0);
    this.add(this._cardLayer);

    scene.add.existing(this);
  }

  get rowNum() { return this._rowNum; }

  /** Total pixel width of this row's cells */
  get totalWidth() {
    return this._rowNum * CELL_W + (this._rowNum - 1) * CELL_GAP;
  }

  /** Height of the row */
  static get HEIGHT() { return CELL_H; }

  /**
   * Add a card of `value` to this row.
   * Returns the world-space {x, y} center of the slot it was placed into,
   * so the caller can tween a card there.
   * @param {number} value  1–6
   * @returns {{ x: number, y: number }}
   */
  addCard(value, suit) {
    if (!this._sets[value]) this._sets[value] = [];
    const slotIndex = this._nextFreeSlot();
    this._sets[value].push({ slotIndex, suit: suit || 's' });
    this._redrawCards();

    const pos = this._cellPositions[slotIndex];
    const world = this.getWorldTransformMatrix();
    return {
      x: world.tx + pos.x + CELL_W / 2,
      y: world.ty + pos.y + CELL_H / 2,
    };
  }

  /**
   * Remove all cards of a given value from this row.
   * Returns the slot indices that were freed (for use when moving a set up a row).
   */
  removeValue(value) {
    const entries = this._sets[value] || [];
    const slots = entries.map(e => e.slotIndex);
    delete this._sets[value];
    this._redrawCards();
    return slots;
  }

  /** How many cards of `value` are currently in this row */
  countValue(value) {
    return (this._sets[value] || []).length;
  }

  /** Total cards placed in this row */
  get totalCards() {
    return Object.values(this._sets).reduce((s, arr) => s + arr.length, 0);
  }

  /** World-space center {x,y} of a cell by index */
  getCellWorldPos(index) {
    const pos = this._cellPositions[index];
    if (!pos) return null;
    const m = this.getWorldTransformMatrix();
    return { x: m.tx + pos.x + CELL_W / 2, y: m.ty + pos.y + CELL_H / 2 };
  }

  /** Map of value → count for all sets in this row */
  get sets() {
    const out = {};
    for (const [v, arr] of Object.entries(this._sets)) {
      if (arr.length > 0) out[Number(v)] = arr.length;
    }
    return out;
  }

  /** Clear all cards from this row */
  clear() {
    this._sets = {};
    this._redrawCards();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _buildCells() {
    this._cellPositions = [];
    const g = this._cellGfx;
    g.clear();

    for (let i = 0; i < this._rowNum; i++) {
      const cx = i * (CELL_W + CELL_GAP);
      const cy = 0;
      this._cellPositions.push({ x: cx, y: cy });

      g.lineStyle(1, 0x4a7c59, 0.8);
      g.fillStyle(0x0d2b1a, 0.6);
      g.fillRoundedRect(cx, cy, CELL_W, CELL_H, CELL_R);
      g.strokeRoundedRect(cx, cy, CELL_W, CELL_H, CELL_R);
    }
  }

  _nextFreeSlot() {
    const used = new Set(Object.values(this._sets).flat().map(s => s.slotIndex));
    for (let i = 0; i < this._rowNum; i++) {
      if (!used.has(i)) return i;
    }
    return 0;
  }

  _redrawCards() {
    this._cardLayer.removeAll(true);

    for (const [valStr, entries] of Object.entries(this._sets)) {
      const value = Number(valStr);
      const label = LABELS[value];

      for (const { slotIndex, suit } of entries) {
        const pos = this._cellPositions[slotIndex];
        if (!pos) continue;

        const suitInfo = SUIT_INFO[suit] || SUIT_INFO['s'];
        const cx = pos.x + CELL_W / 2;
        const cy = pos.y + CELL_H / 2;

        const bg = this.scene.add.graphics();
        // Shadow
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(cx - CELL_W / 2 + 2, cy - CELL_H / 2 + 3, CELL_W, CELL_H, CELL_R);
        // Face
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(cx - CELL_W / 2, cy - CELL_H / 2, CELL_W, CELL_H, CELL_R);
        bg.lineStyle(1.5, 0xdddddd, 1);
        bg.strokeRoundedRect(cx - CELL_W / 2, cy - CELL_H / 2, CELL_W, CELL_H, CELL_R);

        const topText = this.scene.add.text(
          cx - CELL_W / 2 + 4, cy - CELL_H / 2 + 2, label,
          { fontSize: '11px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: suitInfo.color }
        ).setOrigin(0, 0);

        const suitText = this.scene.add.text(cx, cy, suitInfo.symbol, {
          fontSize: '30px', fontFamily: "sans-serif", color: suitInfo.color,
        }).setOrigin(0.5, 0.5);

        const botText = this.scene.add.text(
          cx + CELL_W / 2 - 4, cy + CELL_H / 2 - 2, label,
          { fontSize: '11px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: suitInfo.color }
        ).setOrigin(1, 1);

        this._cardLayer.add([bg, topText, suitText, botText]);
      }
    }
  }
}
