const PIP_POSITIONS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

export default class Dice extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} size - Die width/height in px
   * @param {number} [face] - 1–6, random if omitted
   */
  constructor(scene, x, y, size, face, onToggle, autoHold = true) {
    super(scene, x, y);

    this._size = size;
    this._face = face ?? Phaser.Math.Between(1, 6);
    this._held = false;
    this._onToggle = onToggle ?? null;

    this._gfx = scene.add.graphics();
    this.add(this._gfx);

    const badgeX = size * 0.5;
    const badgeY = -size * 0.5;
    const badgeR = size * 0.2;

    this._lockBg = scene.add.circle(badgeX, badgeY, badgeR, 0xffcc00)
      .setVisible(false);
    this.add(this._lockBg);

    this._lockIcon = scene.add.text(badgeX, badgeY, '🔒', {
      fontSize: `${Math.round(size * 0.24)}px`,
    }).setOrigin(0.5, 0.5).setTint(0x000000).setPadding(2, 2, 2, 0).setVisible(false);
    this.add(this._lockIcon);

    this._redraw();

    const hitZone = scene.add
      .zone(0, 0, size, size)
      .setInteractive({ useHandCursor: true });
    if (autoHold) hitZone.on('pointerdown', () => this.toggleHold());
    this.add(hitZone);
    this._hitZone = hitZone;

    scene.add.existing(this);
  }

  get face() { return this._face; }
  get held() { return this._held; }
  get hitZone() { return this._hitZone; }

  /** Toggle held state and redraw */
  toggleHold() {
    this._held = !this._held;
    this._redraw();
    if (this._onToggle) this._onToggle();
  }

  /** Release hold without toggling */
  release() {
    if (this._held) {
      this._held = false;
      this._redraw();
    }
  }

  /** Pick a new random face and redraw */
  reroll() {
    this._face = Phaser.Math.Between(1, 6);
    this._redraw();
  }

  /** Set a specific face value (1–6) and redraw */
  setFace(value) {
    this._face = value;
    this._redraw();
  }

  _redraw() {
    const g = this._gfx;
    g.clear();

    const s = this._size;
    const half = s / 2;
    const radius = s * 0.15;
    const pipRadius = s * 0.12;
    const offset = s * 0.28;

    // Drop shadow
    g.fillStyle(0x999999, 1);
    g.fillRoundedRect(-half, -half + 8, s, s, radius);

    // Held glow border (drawn behind body)
    if (this._held) {
      g.fillStyle(0xffcc00, 1);
      g.fillRoundedRect(-half - 4, -half - 4, s + 8, s + 8, radius + 3);
    }

    // Die body
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-half, -half, s, s, radius);
    g.lineStyle(this._held ? 3 : 2, this._held ? 0xffcc00 : 0xcccccc, 1);
    g.strokeRoundedRect(-half, -half, s, s, radius);

    // Pips
    g.fillStyle(0x222222, 1);
    for (const [dx, dy] of PIP_POSITIONS[this._face]) {
      g.fillCircle(dx * offset, dy * offset, pipRadius);
    }

    if (this._lockIcon) {
      this._lockBg.setVisible(this._held);
      this._lockIcon.setVisible(this._held);
    }
  }
}
