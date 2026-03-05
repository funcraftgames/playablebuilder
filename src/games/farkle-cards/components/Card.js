// Card values 1–6 with suits. No Phaser import — available as global via main.js bundle.

const CW = 70;
const CH = 100;
const CR = 7;

const LABELS = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' };

const SUIT_INFO = {
  's': { symbol: '♠', color: '#111111' },
  'h': { symbol: '♥', color: '#cc2222' },
  'd': { symbol: '♦', color: '#cc2222' },
  'c': { symbol: '♣', color: '#111111' },
};

export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, value, suit = 's') {
    super(scene, x, y);

    this.cardValue    = value;
    this.cardSuit     = suit;
    this._selected    = false;
    this._enabled     = true;
    this._nonScoring  = false;

    const label = LABELS[value];
    const info  = SUIT_INFO[suit];

    this._bg = scene.add.graphics();

    this._topLabel = scene.add.text(-CW / 2 + 5, -CH / 2 + 3, label, {
      fontSize: '20px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: info.color,
    }).setOrigin(0, 0);

    this._suit = scene.add.text(0, 2, info.symbol, {
      fontSize: '40px', fontFamily: "sans-serif", color: info.color,
    }).setOrigin(0.5, 0.5);

    this._botLabel = scene.add.text(CW / 2 - 5, CH / 2 - 3, label, {
      fontSize: '20px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: info.color,
    }).setOrigin(1, 1);

    this._hitZone = scene.add.zone(0, 0, CW, CH).setInteractive({ useHandCursor: true });
    this._hitZone.on('pointerdown', () => {
      if (this._enabled) {
        this._selected = !this._selected;
        this._draw();
        this.emit('tap', this);
      }
    });

    this.add([this._bg, this._topLabel, this._suit, this._botLabel, this._hitZone]);
    this._draw();

    scene.add.existing(this);
  }

  /** Unique key for this specific card (value + suit) */
  get cardKey() { return `${this.cardValue}-${this.cardSuit}`; }

  get selected() { return this._selected; }

  setSelected(v) {
    this._selected = v;
    this._draw();
  }

  setNonScoring(v) {
    this._nonScoring = v;
    this._draw();
  }

  setEnabled(v) {
    this._enabled = v;
    if (v) {
      this._hitZone.setInteractive({ useHandCursor: true });
      this.setAlpha(1);
    } else {
      this._hitZone.disableInteractive();
      this.setAlpha(0.55);
    }
  }

  static get WIDTH()  { return CW; }
  static get HEIGHT() { return CH; }

  _draw() {
    const g = this._bg;
    g.clear();

    // Shadow
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-CW / 2 + 2, -CH / 2 + 3, CW, CH, CR);

    // Card face — warm tint when selected
    g.fillStyle(this._selected ? 0xfffde8 : 0xffffff, 1);
    g.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);

    // Border
    if (this._nonScoring) {
      g.lineStyle(3, 0xdd3333, 1);
      g.strokeRoundedRect(-CW / 2 - 1, -CH / 2 - 1, CW + 2, CH + 2, CR + 1);
      g.fillStyle(0xdd3333, 0.15);
      g.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);
    } else if (this._selected) {
      g.lineStyle(3, 0xf0c040, 1);
      g.strokeRoundedRect(-CW / 2 - 1, -CH / 2 - 1, CW + 2, CH + 2, CR + 1);
      g.fillStyle(0xf0c040, 0.12);
      g.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);
    } else {
      g.lineStyle(1, 0xcccccc, 1);
      g.strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);
    }
  }
}
