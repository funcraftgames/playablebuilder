const STYLE = {
  color:           '#49bf69',
  colorHover:      '#64c180',
  borderColor:     '#7ef8a3',
  shadowColor:     '#008300',
  shadowOffset:    10,
  labelColor:      '#ffffff',
  fontSize:        '30px',
  fontStyle:       'bold',
  fontFamily:      'MuseoSansRounded, Arial, sans-serif',
  uppercase:       true,
  width:           250,
  height:          50,
  radius:          25,
  // Gem (paid re-roll) mode
  gemColor:        '#6622bb',
  gemColorHover:   '#8844dd',
  gemBorderColor:  '#cc88ff',
  gemShadowColor:  '#220044',
  // Danger (pass turn) mode
  dangerColor:       '#d93025',
  dangerColorHover:  '#e5453a',
  dangerBorderColor: '#ff8a80',
  dangerShadowColor: '#7a1a1a',
};

const toHex = (str) => parseInt(str.replace('#', ''), 16);

export default class MainButton extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {string} label
   * @param {Function} onClick
   */
  constructor(scene, x, y, label, onClick) {
    super(scene, x, y);

    this._mode = 'normal';
    this._hovering = false;

    // Background graphic
    this._bg = scene.add.graphics();
    this._drawBg(false);

    // Label
    this._label = scene.add
      .text(0, 0, STYLE.uppercase ? label.toUpperCase() : label, {
        fontSize:   STYLE.fontSize,
        color:      STYLE.labelColor,
        fontStyle:  STYLE.fontStyle,
        fontFamily: 'MuseoSansRounded, Arial, sans-serif',
        stroke:     '#000000',
        strokeThickness: 3,
        shadow: {
          offsetX: 0,
          offsetY: 2,
          color:   '#000000',
          blur:    4,
          fill:    true,
        },
      })
      .setOrigin(0.5);

    // Hit zone
    const hitZone = scene.add
      .zone(0, 0, STYLE.width, STYLE.height)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      this._hovering = true;
      this._drawBg(true);
    });

    hitZone.on('pointerout', () => {
      this._hovering = false;
      this._drawBg(false);
    });

    hitZone.on('pointerdown', () => {
      if (onClick) onClick();
    });

    this.add([this._bg, this._label, hitZone]);
    scene.add.existing(this);
  }

  /** Update the button label text */
  setLabel(text) {
    this._label.setText(STYLE.uppercase ? text.toUpperCase() : text);
  }

  /** Switch between 'normal' (orange) and 'gem' (purple) mode */
  setMode(mode) {
    this._mode = mode;
    this._drawBg(this._hovering);
  }

  _drawBg(hover) {
    const m = this._mode;
    const color       = m === 'gem' ? STYLE.gemColor       : m === 'danger' ? STYLE.dangerColor       : STYLE.color;
    const colorHover  = m === 'gem' ? STYLE.gemColorHover  : m === 'danger' ? STYLE.dangerColorHover  : STYLE.colorHover;
    const borderColor = m === 'gem' ? STYLE.gemBorderColor : m === 'danger' ? STYLE.dangerBorderColor : STYLE.borderColor;
    const shadowColor = m === 'gem' ? STYLE.gemShadowColor : m === 'danger' ? STYLE.dangerShadowColor : STYLE.shadowColor;

    this._bg.clear();

    // Y-axis shadow
    this._bg.fillStyle(toHex(shadowColor), 1);
    this._bg.fillRoundedRect(
      -STYLE.width / 2,
      -STYLE.height / 2 + STYLE.shadowOffset,
      STYLE.width,
      STYLE.height,
      STYLE.radius
    );

    // Button body
    this._bg.fillStyle(toHex(hover ? colorHover : color), 1);
    this._bg.fillRoundedRect(-STYLE.width / 2, -STYLE.height / 2, STYLE.width, STYLE.height, STYLE.radius);
    this._bg.lineStyle(2, toHex(borderColor), 1);
    this._bg.strokeRoundedRect(-STYLE.width / 2, -STYLE.height / 2, STYLE.width, STYLE.height, STYLE.radius);
  }
}
