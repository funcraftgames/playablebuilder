// ActionButton — pill-shaped button used for COLLECT and DRAW actions.
// No Phaser import — global via main.js bundle.

const toHex = (str) => parseInt(str.replace('#', ''), 16);

export default class ActionButton extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x  center x
   * @param {number} y  center y
   * @param {string} label
   * @param {string} color      hex e.g. '#2d6a4f'
   * @param {string} shadowColor hex
   * @param {Function} onClick
   */
  constructor(scene, x, y, label, color, shadowColor, onClick) {
    super(scene, x, y);

    this._color = color;
    this._shadowColor = shadowColor;
    this._enabled = true;
    this._hover = false;
    this._onClick = onClick;

    this._W = 148;
    this._H = 50;
    this._R = 25;

    this._bg = scene.add.graphics();

    this._label = scene.add.text(0, -1, label.toUpperCase(), {
      fontSize: '26px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 3, fill: true },
    }).setOrigin(0.5, 0.5);

    this._subLabel = scene.add.text(0, 14, '', {
      fontSize: '14px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#000000',
    }).setOrigin(0.5, 0.5);

    const zone = scene.add.zone(0, 0, this._W, this._H).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { this._hover = true;  this._draw(); });
    zone.on('pointerout',  () => { this._hover = false; this._draw(); });
    zone.on('pointerdown', () => { if (this._enabled && this._onClick) this._onClick(); });
    this._zone = zone;

    this.add([this._bg, this._label, this._subLabel, zone]);
    this._draw();

    scene.add.existing(this);
  }

  /** Enable or disable the button */
  setEnabled(v) {
    this._enabled = v;
    this.setAlpha(v ? 1 : 0.4);
    if (v) {
      this._zone.setInteractive({ useHandCursor: true });
    } else {
      this._zone.disableInteractive();
    }
    this._draw();
  }

  /** Update the main label */
  setLabel(text) {
    this._label.setText(text.toUpperCase());
  }

  /** Optional sub-label (e.g. score preview) */
  setSubLabel(text) {
    this._subLabel.setText(text);
    this._label.setY(text ? -7 : -1);
  }

  _draw() {
    const g = this._bg;
    g.clear();

    const col = toHex(this._color);
    const shadow = toHex(this._shadowColor);

    // Shadow
    g.fillStyle(shadow, 1);
    g.fillRoundedRect(-this._W / 2, -this._H / 2 + 8, this._W, this._H, this._R);

    // Body (brighten slightly on hover)
    const bodyColor = this._hover
      ? Phaser.Display.Color.IntegerToColor(col).brighten(20).color
      : col;
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(-this._W / 2, -this._H / 2, this._W, this._H, this._R);

    // Border
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeRoundedRect(-this._W / 2, -this._H / 2, this._W, this._H, this._R);
  }
}
