
import GemCounter from './GemCounter.js';
import GemShopPopup from './GemShopPopup.js';

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
  playerHeaderBg:      '#082a18',
  playerAvatarRadius:  26,
  playerAvatarColor:   '#ff9500',
  playerAvatarBorder:  '#ffcc44',
  playerNameFontSize:  '17px',
  playerScoreFontSize: '32px',
  rowHeight:      44,
  rowPadding:     4,
  labelFontSize:  '16px',
  scoreFontSize:  '16px',
  fontFamily:     'DynaPuff, Arial, sans-serif',
  bgColor:        '#1a3a2a',
  bgAlpha:        0.92,
  rowColorEven:   '#1e4a34',
  rowColorOdd:    '#163020',
  rowColorBonus:  '#2a4a10',
  headerColor:    '#0d2a1a',
  dividerColor:   '#3a6a4a',
  textColor:      '#e8f5e0',
  textDim:        '#7aaa88',
  btnColor:       '#4a9a50',
  btnHover:       '#6aba60',
  btnScored:      '#2a5a30',
  btnBorderColor: '#70cc70',
  btnZero:        '#666666',
  btnZeroHover:   '#888888',
  btnPoints:      '#ffae00',
  btnPointsHover: '#ff8822',  
  btnPointsShadow:'#7a3800',
  btnShadowOffset: 5,  
  btnWidth:       70,
  btnHeight:      28,
  btnRadius:      6,
};

const toHex = (str) => parseInt(str.replace('#', ''), 16);

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
    this._penalty = 0;

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

  /** Set gem count directly */
  setGems(n) {
    if (this._gemCounter) this._gemCounter.setGems(n);
  }

  /** Spend gems (returns remaining) */
  spendGems(amount) {
    if (this._gemCounter) return this._gemCounter.spend(amount);
    return 0;
  }

  get gems() {
    return this._gemCounter ? this._gemCounter.gems : 0;
  }

  /** Deduct points (e.g. gem re-roll cost) */
  addPenalty(amount) {
    this._penalty += amount;
    this._updateScoreDisplay();
  }

  get totalScore() {
    return Math.max(0, Object.values(this._scores).reduce((a, b) => a + b, 0) - this._penalty);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  _buildBoard() {
    const colW = this._width / 2;

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(toHex(STYLE.bgColor), STYLE.bgAlpha);
    bg.fillRoundedRect(0, 0, this._width, this._totalHeight, 10);
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

        // Category label
        const lText = this.scene.add.text(offsetX + 8, rowY + STYLE.rowHeight / 2, cat.label, {
          fontSize: STYLE.labelFontSize,
          color: STYLE.textColor,
          fontFamily: STYLE.fontFamily,
        }).setOrigin(0, 0.5);
        this.add(lText);

        if (!cat.bonus) {
          const btnX = offsetX + colW - STYLE.btnWidth / 2 - 6;
          const btnY = rowY + STYLE.rowHeight / 2;

          const btnGfx = this.scene.add.graphics();
          const btnLabel = this.scene.add.text(btnX, btnY, '--', {
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
            '--', {
              fontSize: STYLE.scoreFontSize,
              color: '#ffffff',
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
    const r = STYLE.playerAvatarRadius;
    const cx = r + 14;
    const cy = h / 2;

    // Header background
    const hdrBg = this.scene.add.graphics();
    hdrBg.fillStyle(toHex(STYLE.playerHeaderBg), 1);
    hdrBg.fillRoundedRect(0, 0, this._width, h, { tl: 10, tr: 10, bl: 0, br: 0 });
    hdrBg.lineStyle(1, toHex(STYLE.dividerColor), 0.8);
    hdrBg.lineBetween(0, h, this._width, h);
    this.add(hdrBg);

    // Avatar circle
    const avatarGfx = this.scene.add.graphics();
    avatarGfx.fillStyle(toHex(STYLE.playerAvatarColor), 1);
    avatarGfx.fillCircle(cx, cy, r);
    avatarGfx.lineStyle(2, toHex(STYLE.playerAvatarBorder), 1);
    avatarGfx.strokeCircle(cx, cy, r);
    this.add(avatarGfx);

    // Initials
    const initials = this._playerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const initialsText = this.scene.add.text(cx, cy, initials, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: STYLE.fontFamily,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.add(initialsText);

    // Player name (shifted up to make room for gems)
    const nameX = cx + r + 12;
    const nameText = this.scene.add.text(nameX, cy - 12, this._playerName, {
      fontSize: STYLE.playerNameFontSize,
      color: STYLE.textColor,
      fontFamily: STYLE.fontFamily,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.add(nameText);

    // Gem counter below name
    this._gemCounter = new GemCounter(this.scene, nameX, cy + 14, 20);
    this.add(this._gemCounter);
    // Show gem shop on click
    this._gemCounter.setInteractive(new Phaser.Geom.Rectangle(0, -10, 60, 28), Phaser.Geom.Rectangle.Contains);
    this._gemCounter.on('pointerdown', () => {
      new GemShopPopup(this.scene, (gems) => this.setGems(this.gems + gems), null, 'Buy more gems');
    });

    // Live score number (right-aligned)
    this._scoreDisplay = this.scene.add.text(this._width - 14, cy, '0', {
      fontSize: STYLE.playerScoreFontSize,
      color: '#ffee44',
      fontFamily: STYLE.fontFamily,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 6, fill: true },
    }).setOrigin(1, 0.5);
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
      obj.btnLabel.setText(pts !== undefined ? String(pts) : '--');
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
