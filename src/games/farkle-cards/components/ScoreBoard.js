// ScoreBoard — top panel showing player scores, round, and turn score.
// No Phaser import — global via main.js bundle.

export default class ScoreBoard extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} width
   */
  constructor(scene, x, y, width) {
    super(scene, x, y);

    this._width = width;
    const h = 72;

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x0a2a14, 0.95);
    bg.fillRoundedRect(0, 0, width, h, 10);
    bg.lineStyle(1, 0x2d6a4f, 1);
    bg.strokeRoundedRect(0, 0, width, h, 10);
    this.add(bg);

    const cx = width / 2;

    // ── Player (left) ────────────────────────────────────────────────────────
    scene.add.text(18, 8, 'YOU', {
      fontSize: '12px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#74c69d',
    }).setOrigin(0, 0);
    this._playerScore = scene.add.text(18, 26, '0', {
      fontSize: '26px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#ffffff',
    }).setOrigin(0, 0);

    // ── Center (turn score + round) ──────────────────────────────────────────
    scene.add.text(cx, 6, 'TURN', {
      fontSize: '11px', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#95d5b2',
    }).setOrigin(0.5, 0);
    this._turnScore = scene.add.text(cx, 22, '0', {
      fontSize: '24px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#f0c040',
    }).setOrigin(0.5, 0);
    this._roundText = scene.add.text(cx, 52, 'Round 1 / 3', {
      fontSize: '11px', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#95d5b2',
    }).setOrigin(0.5, 0);

    // ── CPU (right) ──────────────────────────────────────────────────────────
    scene.add.text(width - 18, 8, 'CPU', {
      fontSize: '12px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#f4a261',
    }).setOrigin(1, 0);
    this._cpuScore = scene.add.text(width - 18, 26, '0', {
      fontSize: '26px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#ffffff',
    }).setOrigin(1, 0);

    // Add all text objects to container
    this.add([
      this._playerScore, this._turnScore, this._roundText, this._cpuScore,
    ]);

    scene.add.existing(this);
  }

  static get HEIGHT() { return 72; }

  /**
   * @param {number} playerScore
   * @param {number} cpuScore
   * @param {number} turnScore
   * @param {number} round   1–3
   * @param {string} [whose] 'player' | 'cpu' — highlights active player
   */
  update(playerScore, cpuScore, turnScore, round, whose) {
    this._playerScore.setText(playerScore.toLocaleString());
    this._cpuScore.setText(cpuScore.toLocaleString());
    this._turnScore.setText(turnScore > 0 ? `+${turnScore.toLocaleString()}` : '0');
    this._roundText.setText(`Round ${round} / 3`);

    this._playerScore.setColor(whose === 'player' ? '#f0c040' : '#ffffff');
    this._cpuScore.setColor(whose === 'cpu' ? '#f0c040' : '#ffffff');
  }
}
