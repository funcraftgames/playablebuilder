const STYLE = {
  fontFamily: 'DynaPuff, Arial, sans-serif',
  textColor:  '#ffffff',
};

export default class GemCounter extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} [initialGems=100]
   */
  constructor(scene, x, y, initialGems = 100) {
    super(scene, x, y);

    this._gems = initialGems;

    // Gem icon — emoji
    const gemIcon = scene.add.text(0, 0, '💎', {
      fontSize: '16px',
      fontFamily: 'Arial',
    }).setOrigin(0, 0.5);
    this.add(gemIcon);

    // Count label
    this._label = scene.add.text(gemIcon.width + 4, 0, String(this._gems), {
      fontSize: '13px',
      color: STYLE.textColor,
      fontFamily: STYLE.fontFamily,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true },
    }).setOrigin(0, 0.5);
    this.add(this._label);

    scene.add.existing(this);
  }

  get gems() { return this._gems; }

  setGems(n) {
    this._gems = Math.max(0, n);
    this._label.setText(String(this._gems));
  }

  spend(amount) {
    this.setGems(this._gems - amount);
    return this._gems;
  }
}
