
const CATEGORIES = [
  // Upper section
  { key: 'ones',          label: 'Ones',            section: 'upper' },
  { key: 'twos',          label: 'Twos',            section: 'upper' },
  { key: 'threes',        label: 'Threes',          section: 'upper' },
  { key: 'fours',         label: 'Fours',           section: 'upper' },
  { key: 'fives',         label: 'Fives',           section: 'upper' },
  { key: 'sixes',         label: 'Sixes',           section: 'upper' },
  { key: 'bonus',         label: 'Bonus (+50)',      section: 'upper', bonus: true },
  // Lower section
  { key: 'onePair',       label: 'One Pair',        section: 'lower' },
  { key: 'twoPairs',      label: 'Two Pairs',       section: 'lower' },
  { key: 'threeOfAKind',  label: '3 of a Kind', section: 'lower' },
  { key: 'fourOfAKind',   label: '4 of a Kind',  section: 'lower' },
  { key: 'smallStraight', label: 'Sm. Straight',    section: 'lower' },
  { key: 'largeStraight', label: 'Lg. Straight',    section: 'lower' },
  { key: 'fullHouse',     label: 'Full House',      section: 'lower' },
  { key: 'chance',        label: 'Chance',          section: 'lower' },
  { key: 'yatzy',         label: 'YATZY',           section: 'lower' },
];

const STYLE = {
  playerHeaderHeight:  84,
  playerHeaderBg:      '#5c2800',
  playerScoreFontSize: '32px',
  rowHeight:      44,
  rowPadding:     4,
  labelFontSize:  '16px',
  scoreFontSize:  '16px',
  fontFamily:     'MuseoSansRounded, Arial, sans-serif',
  bgColor:        '#ffffff',
  bgAlpha:        1,
  bgShadowColor:  '#00000030',
  bgBorderColor:  '#cccccc',
  rowColorEven:   '#f5f5f5',
  rowColorOdd:    '#e8e8e8',
  rowColorBonus:  '#ffd200',
  headerColor:    '#444444',
  dividerColor:   '#bbbbbb',
  textColor:      '#000000',
  textDim:        '#888888',
  btnColor:       '#eeeeee',
  btnHover:       '#e0e0e0',
  btnScored:      '#aaaaaa',
  btnBorderColor: '#888888',
  btnZero:        '#bbbbbb',
  btnZeroHover:   '#999999',
  btnPoints:      '#49bf69',
  btnPointsHover: '#64c180',
  btnPointsShadow:'#008300',
  btnShadowOffset: 5,
  btnWidth:       70,
  btnHeight:      28,
  btnRadius:      6,
};

const toHex = (str) => parseInt(str.replace('#', ''), 16);

const DICE_FACE = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 };

const PIP_POSITIONS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

export default class ScoreBoard extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {Function} onScore - called with (categoryKey, points)
   */
  constructor(scene, x, y, width, onScore, playerName = 'Player 1', onBeforeScore = null) {
    super(scene, x, y);

    this._width = width;
    this._onScore = onScore;
    this._onBeforeScore = onBeforeScore;
    this._scores = {};      // key -> scored points
    this._pending = {};     // key -> available points (from dice)
    this._playerName = playerName;
    this._headerOffset = STYLE.playerHeaderHeight;

    const upperCats = CATEGORIES.filter(c => c.section === 'upper');
    const lowerCats = CATEGORIES.filter(c => c.section === 'lower');
    this._totalHeight =
      Math.max(upperCats.length, lowerCats.length) * (STYLE.rowHeight + STYLE.rowPadding) + 40
      + this._headerOffset;

    this._buildBoard();
    this._buildPlayerHeader();

    scene.add.existing(this);
  }

  /** Update available (pending) scores based on current dice values */
  updateAvailable(diceValues) {
    this._pending = this._calcAllScores(diceValues);
    this._refreshRows();
  }

  /** Clear pending scores (after roll starts). Pass exceptKey to preserve one button's state. */
  clearPending(exceptKey) {
    if (exceptKey !== undefined) {
      const kept = this._pending[exceptKey];
      this._pending = {};
      if (kept !== undefined) this._pending[exceptKey] = kept;
    } else {
      this._pending = {};
    }
    this._refreshRows(exceptKey);
  }

  get totalScore() {
    return Object.values(this._scores).reduce((a, b) => a + b, 0);
  }

  get boardHeight() { return this._totalHeight; }
  get boardWidth()  { return this._width; }

  // ─── Private ─────────────────────────────────────────────────────────────

  _buildBoard() {
    const colW = this._width / 2;

    // Panel drop shadow (vertical offset)
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.15);
    bg.fillRoundedRect(0, 8, this._width, this._totalHeight, 10);
    // Panel background
    bg.fillStyle(toHex(STYLE.bgColor), STYLE.bgAlpha);
    bg.fillRoundedRect(0, 0, this._width, this._totalHeight, 10);
    // Panel stroke
    bg.lineStyle(1.5, toHex(STYLE.bgBorderColor), 1);
    bg.strokeRoundedRect(0, 0, this._width, this._totalHeight, 10);
    // Vertical column divider (below header)
    bg.lineStyle(1, toHex(STYLE.dividerColor), 0.8);
    bg.lineBetween(colW, this._headerOffset, colW, this._totalHeight);
    this.add(bg);

    this._rowObjects = {};

    ['upper', 'lower'].forEach((section, colIndex) => {
      const offsetX = colIndex * colW;
      const cats = CATEGORIES.filter(c => c.section === section);

      // Section header
      const headerBg = this.scene.add.graphics();
      headerBg.fillStyle(toHex(STYLE.headerColor), 1);
      headerBg.fillRect(offsetX, this._headerOffset, colW, 22);
      this.add(headerBg);

      const headerLabel = section === 'upper' ? '— UPPER —' : '— LOWER —';
      const hText = this.scene.add.text(offsetX + colW / 2, this._headerOffset + 11, headerLabel, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: STYLE.fontFamily,
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add(hText);

      let y = this._headerOffset + 26;

      cats.forEach((cat, i) => {
        const rowY = y;
        const rowColor = cat.bonus ? STYLE.rowColorBonus : (i % 2 === 0 ? STYLE.rowColorEven : STYLE.rowColorOdd);

        // Row background
        const rowBg = this.scene.add.graphics();
        rowBg.fillStyle(toHex(rowColor), 1);
        rowBg.fillRect(offsetX, rowY, colW, STYLE.rowHeight);
        this.add(rowBg);

        // Category label — dice icon for upper number rows, text for everything else
        if (DICE_FACE[cat.key] !== undefined) {
          const dieSize = 28;
          const dieGfx = this.scene.add.graphics();
          this._drawDiceFace(dieGfx, offsetX + 8 + dieSize / 2, rowY + STYLE.rowHeight / 2, dieSize, DICE_FACE[cat.key]);
          this.add(dieGfx);
        } else {
          const lText = this.scene.add.text(offsetX + 8, rowY + STYLE.rowHeight / 2, cat.label, {
            fontSize: STYLE.labelFontSize,
            color: STYLE.textColor,
            fontFamily: STYLE.fontFamily,
          }).setOrigin(0, 0.5);
          this.add(lText);
        }

        if (!cat.bonus) {
          const btnX = offsetX + colW - STYLE.btnWidth / 2 - 6;
          const btnY = rowY + STYLE.rowHeight / 2;

          const btnGfx = this.scene.add.graphics();
          const btnLabel = this.scene.add.text(btnX, btnY, '', {
            fontSize: STYLE.scoreFontSize,
            color: STYLE.textColor,
            fontFamily: STYLE.fontFamily,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 4, fill: true },
          }).setOrigin(0.5);

          const hitZone = this.scene.add
            .zone(btnX, btnY, STYLE.btnWidth, STYLE.btnHeight)
            .setInteractive({ useHandCursor: true });

          this._drawBtn(btnGfx, btnX, btnY, false, false);

          hitZone.on('pointerover', () => {
            if (this._scores[cat.key] === undefined) this._drawBtn(btnGfx, btnX, btnY, true, false, this._pending[cat.key]);
          });
          hitZone.on('pointerout', () => {
            if (this._scores[cat.key] === undefined) this._drawBtn(btnGfx, btnX, btnY, false, false, this._pending[cat.key]);
          });
          hitZone.on('pointerdown', () => {
            if (this._scores[cat.key] !== undefined) return;
            // Lock immediately to prevent double-tap
            hitZone.disableInteractive();

            const pts = this._pending[cat.key] ?? 0;
            // World position of this button
            const worldX = this.x + btnX;
            const worldY = this.y + btnY;

            // Reset all other buttons immediately
            this.clearPending(cat.key);

            const apply = () => {
              this._scores[cat.key] = pts;
              btnLabel.setText(String(pts));
              this._drawBtn(btnGfx, btnX, btnY, false, true);
              this._checkBonus();
              this._updateScoreDisplay();
              if (this._onScore) this._onScore(cat.key, pts);
            };

            if (this._onBeforeScore) {
              this._onBeforeScore(worldX, worldY, apply);
            } else {
              apply();
            }
          });

          this.add([btnGfx, btnLabel, hitZone]);
          this._rowObjects[cat.key] = { btnGfx, btnLabel, btnX, btnY, hitZone };
        } else {
          this._bonusLabel = this.scene.add.text(
            offsetX + colW - STYLE.btnWidth / 2 - 6,
            rowY + STYLE.rowHeight / 2,
            '0/63', {
              fontSize: STYLE.scoreFontSize,
              color: STYLE.textColor,
              fontFamily: STYLE.fontFamily,
              fontStyle: 'bold',
            }
          ).setOrigin(0.5);
          this.add(this._bonusLabel);
        }

        y += STYLE.rowHeight + STYLE.rowPadding;
      });
    });
  }

  _buildPlayerHeader() {
    const h = STYLE.playerHeaderHeight;
    const cy = h / 2;

    // Header background
    const hdrBg = this.scene.add.graphics();
    hdrBg.fillStyle(toHex(STYLE.playerHeaderBg), 1);
    hdrBg.fillRoundedRect(0, 0, this._width, h, { tl: 10, tr: 10, bl: 0, br: 0 });
    hdrBg.lineStyle(1, toHex(STYLE.dividerColor), 0.8);
    hdrBg.lineBetween(0, h, this._width, h);
    this.add(hdrBg);

    // "SCORE" label centered
    const scoreLabel = this.scene.add.text(this._width / 2, cy - 14, 'SCORE', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: STYLE.fontFamily,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.add(scoreLabel);

    // Score number centered
    this._scoreDisplay = this.scene.add.text(this._width / 2, cy + 10, '0', {
      fontSize: STYLE.playerScoreFontSize,
      color: '#ffffff',
      fontFamily: STYLE.fontFamily,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 6, fill: true },
    }).setOrigin(0.5, 0.5);
    this.add(this._scoreDisplay);
  }

  _updateScoreDisplay() {
    if (this._scoreDisplay) {
      this._scoreDisplay.setText(String(this.totalScore));
    }
  }

  _drawBtn(g, x, y, hover, scored, pts) {
    g.clear();
    let color;
    if (scored) {
      color = STYLE.btnScored;
    } else if (pts === 0) {
      color = hover ? STYLE.btnZeroHover : STYLE.btnZero;
    } else if (pts > 0) {
      color = hover ? STYLE.btnPointsHover : STYLE.btnPoints;
    } else {
      color = hover ? STYLE.btnHover : STYLE.btnColor;
    }
    // Y-axis drop shadow for orange buttons
    if (!scored && pts > 0) {
      g.fillStyle(toHex(STYLE.btnPointsShadow), 1);
      g.fillRoundedRect(
        x - STYLE.btnWidth / 2,
        y - STYLE.btnHeight / 2 + STYLE.btnShadowOffset,
        STYLE.btnWidth, STYLE.btnHeight, STYLE.btnRadius
      );
    }
    g.fillStyle(toHex(color), 1);
    g.fillRoundedRect(x - STYLE.btnWidth / 2, y - STYLE.btnHeight / 2, STYLE.btnWidth, STYLE.btnHeight, STYLE.btnRadius);
    g.lineStyle(1, toHex(STYLE.btnBorderColor), scored ? 0.3 : 0.8);
    g.strokeRoundedRect(x - STYLE.btnWidth / 2, y - STYLE.btnHeight / 2, STYLE.btnWidth, STYLE.btnHeight, STYLE.btnRadius);
  }

  _refreshRows(exceptKey) {
    CATEGORIES.forEach((cat) => {
      if (cat.bonus || this._scores[cat.key] !== undefined) return;
      if (exceptKey !== undefined && cat.key === exceptKey) return;
      const obj = this._rowObjects[cat.key];
      if (!obj) return;
      const pts = this._pending[cat.key];
      obj.btnLabel.setText(pts !== undefined ? String(pts) : '');
      obj.btnLabel.setColor(pts !== undefined ? '#ffffff' : STYLE.textColor);
      this._drawBtn(obj.btnGfx, obj.btnX, obj.btnY, false, false, pts);
    });
  }

  _checkBonus() {
    const upperKeys = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
    const upperTotal = upperKeys.reduce((sum, k) => sum + (this._scores[k] ?? 0), 0);
    const allUpperScored = upperKeys.every((k) => this._scores[k] !== undefined);
    if (allUpperScored) {
      const bonus = upperTotal >= 63 ? 50 : 0;
      this._scores['bonus'] = bonus;
      this._bonusLabel.setText(upperTotal >= 63 ? '+50' : '0');
    } else {
      this._bonusLabel.setText(`${upperTotal}/63`);
    }
  }

  _drawDiceFace(g, cx, cy, size, face) {
    const half = size / 2;
    const radius = size * 0.18;
    const pipR = size * 0.11;
    const offset = size * 0.28;
    // Drop shadow
    g.fillStyle(0x999999, 0.5);
    g.fillRoundedRect(cx - half, cy - half + 3, size, size, radius);
    // Body
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - half, cy - half, size, size, radius);
    g.lineStyle(1.5, 0xaaaaaa, 1);
    g.strokeRoundedRect(cx - half, cy - half, size, size, radius);
    // Pips
    g.fillStyle(0x222222, 1);
    for (const [dx, dy] of PIP_POSITIONS[face]) {
      g.fillCircle(cx + dx * offset, cy + dy * offset, pipR);
    }
  }

  // ─── Score Calculations ──────────────────────────────────────────────────

  _calcAllScores(dice) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    dice.forEach((v) => counts[v]++);
    const sum = dice.reduce((a, b) => a + b, 0);
    const sorted = [...dice].sort((a, b) => a - b);

    const result = {};

    // Upper
    for (let n = 1; n <= 6; n++) {
      result[['ones','twos','threes','fours','fives','sixes'][n - 1]] = counts[n] * n;
    }

    // Pairs / sets
    const pairs = [2,3,4,5,6].filter((n) => counts[n] >= 2).map((n) => n * 2);
    result.onePair       = pairs.length >= 1 ? Math.max(...pairs) : 0;
    const topTwoPairs    = pairs.sort((a,b) => b - a).slice(0, 2);
    result.twoPairs      = topTwoPairs.length >= 2 ? topTwoPairs[0] + topTwoPairs[1] : 0;
    const threeVal       = [1,2,3,4,5,6].find((n) => counts[n] >= 3);
    result.threeOfAKind  = threeVal ? threeVal * 3 : 0;
    const fourVal        = [1,2,3,4,5,6].find((n) => counts[n] >= 4);
    result.fourOfAKind   = fourVal ? fourVal * 4 : 0;

    // Straights
    const uniq = [...new Set(sorted)].join('');
    result.smallStraight = uniq.includes('12345') ? 15 : 0;
    result.largeStraight = uniq.includes('23456') ? 20 : 0;

    // Full house
    const hasThree = [1,2,3,4,5,6].find((n) => counts[n] === 3);
    const hasPair  = [1,2,3,4,5,6].find((n) => counts[n] === 2);
    result.fullHouse = hasThree && hasPair ? hasThree * 3 + hasPair * 2 : 0;

    // Chance
    result.chance = sum;

    // Yatzy
    result.yatzy = counts.some((c) => c === 5) ? 50 : 0;

    return result;
  }
}
