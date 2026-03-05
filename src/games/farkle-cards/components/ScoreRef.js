// ScoreRef — static Farkle scoring reference panel with 2 columns.
// No Phaser import — global via main.js bundle.

const COL1 = [
  ['1 Ace',    '100'],
  ['1 Five',    '50'],
  ['3 Aces',  '1000'],
  ['3×2s',    '200'],
  ['3×3s',    '300'],
  ['3×4s',    '400'],
  ['3×5s',    '500'],
];

const COL2 = [
  ['3×6s',    '600'],
  ['4 of kind', '1000'],
  ['5 of kind', '2000'],
  ['Straight', '1500'],
  ['3 Pairs',  '1500'],
  ['2 Triplets',  '2500'],
];

export default class ScoreRef extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height) {
    super(scene, x, y);

    const bg = scene.add.graphics();
    // Wood-tone background
    bg.fillStyle(0x5a3818, 1);
    bg.fillRoundedRect(0, 0, width, height, 10);
    // Inner highlight
    bg.fillStyle(0x7a4f28, 0.5);
    bg.fillRoundedRect(2, 2, width - 4, height * 0.15, 8);
    // Border
    bg.lineStyle(2, 0x3d2510, 1);
    bg.strokeRoundedRect(0, 0, width, height, 10);
    this.add(bg);

    this.add(scene.add.text(width / 2, 6, 'SCORING', {
      fontSize: '18px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#f0c040',
      stroke: '#3d2510', strokeThickness: 2,
    }).setOrigin(0.5, 0));

    const pad     = 10;
    const colGap  = 12;
    const titleH  = 28;
    const colW    = (width - pad * 2 - colGap) / 2;
    const maxRows = Math.max(COL1.length, COL2.length);
    const rowH    = Math.min(22, (height - titleH - pad * 2) / maxRows);
    const startY  = titleH + Math.max(pad, (height - titleH - maxRows * rowH) / 2);

    const lines = scene.add.graphics();
    this.add(lines);

    const addCol = (rules, offsetX) => {
      rules.forEach(([label, value], i) => {
        const ry = startY + i * rowH;
        const labelText = scene.add.text(pad + offsetX, ry, label, {
          fontSize: '16px', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#e8d4b0',
        }).setOrigin(0, 0);
        this.add(labelText);
        this.add(scene.add.text(pad + offsetX + colW - 4, ry, value, {
          fontSize: '16px', fontStyle: 'bold', fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#ffffff',
        }).setOrigin(1, 0));

        // Dotted line between label and value
        const lineY = ry + 14;
        const lineX1 = pad + offsetX + labelText.width + 4;
        const lineX2 = pad + offsetX + colW - 8;
        lines.lineStyle(1, 0x8a6538, 0.5);
        for (let dx = lineX1; dx < lineX2; dx += 4) {
          lines.lineBetween(dx, lineY, dx + 2, lineY);
        }
      });
    };

    addCol(COL1, 0);
    addCol(COL2, colW + colGap);

    scene.add.existing(this);
  }
}
