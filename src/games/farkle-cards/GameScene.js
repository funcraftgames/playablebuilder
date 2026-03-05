import Phaser from 'phaser';
import Card from './components/Card.js';
import GridRow from './components/GridRow.js';
import ScoreRef from './components/ScoreRef.js';
import ActionButton from './components/ActionButton.js';
import { getSafeArea } from '../shared/safeArea.js';

// ── Deck ──────────────────────────────────────────────────────────────────────

const SUITS = ['s', 'h', 'd', 'c'];

function makeDeck() {
  const deck = [];
  for (let copies = 0; copies < 2; copies++) {
    for (const suit of SUITS) {
      for (let v = 1; v <= 6; v++) deck.push({ value: v, suit });
    }
  }
  return deck;  // 48 cards: 2 copies × 4 suits × 6 values
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Farkle Scoring ────────────────────────────────────────────────────────────

function calcScore(valueCounts) {
  const entries = Object.entries(valueCounts).map(([k, v]) => [Number(k), v]);
  const total   = entries.reduce((s, [, c]) => s + c, 0);
  if (total === 6 && entries.length === 6 && entries.every(([, c]) => c === 1)) return 1500;
  if (total === 6 && entries.filter(([, c]) => c === 2).length === 3) return 750;
  let score = 0;
  for (const [v, count] of entries) {
    if (count >= 3) {
      const base = v === 1 ? 1000 : v * 100;
      const mult = count === 3 ? 1 : count === 4 ? 2 : count === 5 ? 4 : 8;
      score += base * mult;
      const rem = count % 3;
      if (rem > 0) {
        if (v === 1) score += rem * 100;
        if (v === 5) score += rem * 50;
      }
    } else {
      if (v === 1) score += count * 100;
      if (v === 5) score += count * 50;
    }
  }
  return score;
}

/** Values in the placed set that contribute 0 to the score */
function getNonScoringValues(valueCounts) {
  const entries = Object.entries(valueCounts).map(([k, v]) => [Number(k), v]);
  const total   = entries.reduce((s, [, c]) => s + c, 0);
  if (total === 6 && entries.length === 6 && entries.every(([, c]) => c === 1)) return new Set();
  if (total === 6 && entries.filter(([, c]) => c === 2).length === 3) return new Set();
  const ns = new Set();
  for (const [v, count] of entries) {
    if (v === 1 || v === 5) continue;
    if (count < 3) ns.add(v);
  }
  return ns;
}

function hasAnyScoringPotential(values) {
  if (values.includes(1) || values.includes(5)) return true;
  const counts = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.values(counts).some(c => c >= 3);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATE_PLAYER = 'PLAYER';

const HAND_SIZE    = 6;
const TOP_ROW_H    = 170;
const PAD          = 10;
const BTN_AREA_H   = 68;
const MARGIN_V     = 10;
const ROW_LABEL_W  = 28;
const CARD_SCALE   = 0.64; // scale when placed in a row cell

const RIGGED       = true; // When true, first hand is 4 Aces; draw after = farkle

// ── GameScene ─────────────────────────────────────────────────────────────────

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this._farkleLogoUrl = new URL('./assets/Farkle.png', import.meta.url).href;
    this.load.image('farkle-logo', this._farkleLogoUrl);
  }

  create() {
    this._state       = STATE_PLAYER;
    this._playerTotal = 0;
    this._turnScore   = 0;
    this._currentRow  = HAND_SIZE; // active row, counts 6 → 1
    this._hand        = [];        // Card[] in the hand zone
    this._rowCards    = [];        // {card, cellIdx}[] placed in active row
    this._rowOccupied = new Set(); // occupied cell indices
    this._deck        = shuffle(makeDeck());
    this._discard     = [];
    this._busy        = false; // blocks card taps during transitions
    this._riggedFirstDeal  = RIGGED; // next deal is the rigged 4-aces hand
    this._riggedFarkle     = false;  // next deal forced to be a farkle

    const { width } = this.scale;

    this._bgGfx   = this.add.graphics();

    // Score panel
    this._scoreLabelBg = this.add.graphics();
    this._avatarText = this.add.text(0, 0, '🎲', {
      fontSize: '28px',
    }).setOrigin(0.5, 0.5);
    this._youLabel = this.add.text(0, 0, 'YOU', {
      fontSize: '11px', fontStyle: 'bold',
      fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#d4a056',
    }).setOrigin(0.5, 0);
    this._scoreText = this.add.text(0, 0, '0', {
      fontSize: '48px', fontStyle: 'bold',
      fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#ffffff',
      stroke: '#5a3010', strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    this._scoreRef = new ScoreRef(this, 0, 0, 100, 100);

    this._gridRows = [];
    this._rowScoreLabels = [];
    for (let n = 1; n <= 6; n++) {
      this._gridRows.push(new GridRow(this, 0, 0, n, width - PAD * 2 ));
      this._rowScoreLabels.push(this.add.text(0, 0, '', {
        fontSize: '20px', fontStyle: 'bold',
        fontFamily: "'MuseoSansRounded', 'Arial', sans-serif", color: '#f0c040',
      }).setOrigin(0, 0.5));
    }

    this._collectBtn = new ActionButton(this, 0, 0, 'Collect', '#ff8000', '#a83500',
      () => this._onCollect());
    this._collectBtn.setEnabled(false);

    this._drawBtn = new ActionButton(this, 0, 0, 'Draw', '#00b46a', '#00561a',
      () => this._onDraw());
    this._drawBtn.setEnabled(false);


    this._layout();
    this.scale.on('resize', this._layout, this);
    this._startPlayerTurn();
    window.dispatchEvent(new Event('__gameReady'));
  }

  // ── Layout ────────────────────────────────────────────────────────────────────

  _layout() {
    const { width, height } = this.scale;
    const safe = getSafeArea();
    const top  = safe.top + MARGIN_V;

    this._bgGfx.clear();
    this._bgGfx.fillGradientStyle(0x00895d, 0x00895d, 0x0d2b1a, 0x0d2b1a, 1);
    this._bgGfx.fillRect(0, 0, width, height);

    // Top row: Score on left, ScoreRef on right (same row, full width)
    const fullW      = width - PAD * 2;
    const scoreW     = 90;
    const refW       = fullW - scoreW - PAD;
    const g          = this._scoreLabelBg;
    g.clear();

    // Drop shadow for score panel
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(PAD + 3, top + 4, scoreW, TOP_ROW_H, 10);
    // Wood-tone background
    g.fillStyle(0x5a3818, 1);
    g.fillRoundedRect(PAD, top, scoreW, TOP_ROW_H, 10);
    // Inner highlight
    g.fillStyle(0x7a4f28, 0.6);
    g.fillRoundedRect(PAD + 2, top + 2, scoreW - 4, TOP_ROW_H * 0.35, 8);
    // Border
    g.lineStyle(2, 0x3d2510, 1);
    g.strokeRoundedRect(PAD, top, scoreW, TOP_ROW_H, 10);

    // Drop shadow for ScoreRef panel
    const refX = PAD + scoreW + PAD;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(refX + 3, top + 4, refW, TOP_ROW_H, 10);

    // Avatar + YOU label + score text layout
    const scoreCx = PAD + scoreW / 2;
    const avatarY = top + 24;
    const youY    = avatarY + 18;
    const scoreY  = top + TOP_ROW_H / 2 + 28;
    this._avatarText.setPosition(scoreCx, avatarY);
    this._youLabel.setPosition(scoreCx, youY);
    this._scoreText.setPosition(scoreCx, scoreY);

    // ScoreRef panel (2-column, same height as score label)
    if (this._scoreRef._cachedW !== refW || this._scoreRef._cachedH !== TOP_ROW_H) {
      this._scoreRef.destroy();
      this._scoreRef = new ScoreRef(this, refX, top, refW, TOP_ROW_H);
      this._scoreRef._cachedW = refW;
      this._scoreRef._cachedH = TOP_ROW_H;
    } else {
      this._scoreRef.setPosition(refX, top);
    }

    // Grid — below top row
    const handH      = Card.HEIGHT + PAD;
    const gridBottom = height - safe.bottom - MARGIN_V - BTN_AREA_H - handH - PAD * 2;
    const gridTop    = top + TOP_ROW_H + PAD;
    const availH     = gridBottom - gridTop;
    const rowGap     = Math.min(4, Math.max(2, (availH - 6 * GridRow.HEIGHT) / 5));
    const totalRowsH = 6 * GridRow.HEIGHT + 5 * rowGap;
    const gridStartY = gridTop + Math.max(0, (availH - totalRowsH) / 2);

    this._gridRows.forEach((row, i) => {
      const rowY = gridStartY + i * (GridRow.HEIGHT + rowGap);
      row.setPosition(PAD + ROW_LABEL_W, rowY);
      const labelX = PAD + ROW_LABEL_W + row.totalWidth + 8;
      this._rowScoreLabels[i].setPosition(labelX, rowY + GridRow.HEIGHT / 2);
    });

    // Hand area
    const handCenterY = height - safe.bottom - MARGIN_V - BTN_AREA_H - PAD - handH / 2;
    // Reposition hand cards
    this._repositionHand(width, handCenterY, false);

    // Reposition placed row cards
    if (this._rowCards.length > 0) {
      const activeRow = this._gridRows[this._currentRow - 1];
      this._rowCards.forEach(({ card, cellIdx }) => {
        const pos = activeRow.getCellWorldPos(cellIdx);
        if (pos) { card.setPosition(pos.x, pos.y); card.setScale(CARD_SCALE); }
      });
    }

    // Buttons
    const btnY  = height - safe.bottom - MARGIN_V - BTN_AREA_H / 2;
    const halfW = 74 + 8;
    this._collectBtn.setPosition(width / 2 - halfW, btnY);
    this._drawBtn.setPosition(width / 2 + halfW, btnY);
  }

  /** Position hand cards. If animate=true, tweens them; otherwise snaps. */
  _repositionHand(width, centerY, animate = false) {
    if (this._hand.length === 0) return;
    const gap    = 8;
    const totalW = this._hand.length * Card.WIDTH + (this._hand.length - 1) * gap;
    const startX = (width - totalW) / 2 + Card.WIDTH / 2;
    this._hand.forEach((card, i) => {
      const tx = startX + i * (Card.WIDTH + gap);
      if (animate) {
        this.tweens.add({ targets: card, x: tx, y: centerY, scaleX: 1, scaleY: 1, duration: 220, ease: 'Power2' });
      } else {
        card.setPosition(tx, centerY);
        card.setScale(1);
      }
    });
  }


  // ── Deck helpers ──────────────────────────────────────────────────────────────

  _pop(excludeKeys) {
    if (this._deck.length === 0) {
      this._deck   = shuffle(this._discard);
      this._discard = [];
    }
    if (!excludeKeys || excludeKeys.size === 0) {
      return this._deck.length > 0 ? this._deck.pop() : null;
    }
    // Find first card whose value-suit key is not excluded
    for (let i = this._deck.length - 1; i >= 0; i--) {
      const c = this._deck[i];
      if (!excludeKeys.has(`${c.value}-${c.suit}`)) {
        return this._deck.splice(i, 1)[0];
      }
    }
    return null;
  }

  /** Deal `n` new cards from the deck into the hand. */
  _dealCards(n) {
    const { width, height } = this.scale;
    const safe        = getSafeArea();
    const handCenterY = height - safe.bottom - MARGIN_V - BTN_AREA_H - PAD - (Card.HEIGHT + PAD) / 2;
    const firstNew    = this._hand.length;

    // Rigged deals: force specific cards
    let forcedCards = null;
    if (this._riggedFirstDeal) {
      this._riggedFirstDeal = false;
      // 4 Aces + 2 non-scoring fillers (2, 3 — no points alone)
      forcedCards = [
        { value: 1, suit: 's' }, { value: 1, suit: 'h' },
        { value: 1, suit: 'd' }, { value: 1, suit: 'c' },
        { value: 2, suit: 'h' }, { value: 3, suit: 'd' },
      ];
    } else if (this._riggedFarkle) {
      this._riggedFarkle = false;
      // All non-scoring: 2,3,4,6 — no 1s, no 5s, no triples
      const fillers = [
        { value: 2, suit: 's' }, { value: 3, suit: 'h' },
        { value: 4, suit: 'd' }, { value: 6, suit: 'c' },
        { value: 2, suit: 'd' }, { value: 4, suit: 'h' },
      ];
      forcedCards = fillers.slice(0, n);
    }

    const handKeys = new Set(this._hand.map(c => c.cardKey));
    for (let i = 0; i < n; i++) {
      let drawn;
      if (forcedCards && i < forcedCards.length) {
        drawn = forcedCards[i];
      } else {
        drawn = this._pop(handKeys);
      }
      if (drawn === null) break;
      handKeys.add(`${drawn.value}-${drawn.suit}`);
      const card = new Card(this, 0, handCenterY, drawn.value, drawn.suit);
      card.on('tap', (c) => this._onCardTap(c));
      this._hand.push(card);
    }

    // Compute target positions
    const gap    = 8;
    const totalW = this._hand.length * Card.WIDTH + (this._hand.length - 1) * gap;
    const startX = (width - totalW) / 2 + Card.WIDTH / 2;

    this._hand.forEach((card, i) => {
      const tx = startX + i * (Card.WIDTH + gap);
      if (i < firstNew) {
        card.setScale(1);
        card.setPosition(tx, handCenterY);
      } else {
        this.tweens.add({
          targets: card, x: tx, y: handCenterY,
          duration: 280, delay: (i - firstNew) * 70, ease: 'Back.easeOut',
        });
      }
    });

    // Rigged: bounce the first ace to draw attention (loops until tapped)
    if (RIGGED && forcedCards) {
      const firstAce = this._hand.find(c => c.cardValue === 1);
      if (firstAce) {
        const allLanded = (n - 1) * 70 + 320;
        this.time.delayedCall(allLanded, () => {
          this._aceBounce = this.tweens.add({
            targets: firstAce, scaleX: 1.15, scaleY: 1.15,
            duration: 200, ease: 'Quad.easeOut',
            yoyo: true, repeat: -1, repeatDelay: 300,
          });
          firstAce.once('tap', () => {
            if (this._aceBounce) {
              this._aceBounce.stop();
              this._aceBounce = null;
              firstAce.setScale(1);
            }
          });
        });
      }
    }
  }

  // ── Turn management ───────────────────────────────────────────────────────────

  _startPlayerTurn() {
    this._state       = STATE_PLAYER;
    this._busy        = false;
    this._turnScore   = 0;
    this._currentRow  = HAND_SIZE;
    this._rowCards    = [];
    this._rowOccupied = new Set();
    this._hand.forEach(c => { this._discard.push({ value: c.cardValue, suit: c.cardSuit }); c.destroy(); });
    this._hand = [];
    this._gridRows.forEach(r => r.clear());
    this._refreshScore();
    this._refreshRowScores();
    this._startRow();
  }

  /** Set up a new active row and deal cards to fill hand. */
  _startRow() {
    this._rowCards    = [];
    this._rowOccupied = new Set();
    this._redrawUsed  = false;
    this._drawBtn.setLabel('Draw');
    this._drawBtn.setEnabled(false);

    const toAdd = this._nextDealCount != null
      ? this._nextDealCount
      : this._currentRow - this._hand.length;
    this._nextDealCount = null;
    if (toAdd > 0) this._dealCards(toAdd);

    // Block interaction while cards land
    this._busy = true;

    // Farkle check after cards land — player regains control here
    const delay = Math.max(toAdd, 1) * 70 + 350;
    this.time.delayedCall(delay, () => {
      if (this._state !== STATE_PLAYER) return;
      const values = this._hand.map(c => c.cardValue);
      console.log('[Farkle check] hand values:', values, 'scoring?', hasAnyScoringPotential(values));
      if (!hasAnyScoringPotential(values)) {
        this._farkle();
      } else {
        this._busy = false;
        this._refreshButtons();
      }
    });
  }

  // ── Card interaction ──────────────────────────────────────────────────────────

  _onCardTap(card) {
    if (this._state !== STATE_PLAYER || this._busy) return;
    const entry = this._rowCards.find(e => e.card === card);
    if (entry) {
      this._returnCardToHand(entry);
    } else {
      this._placeCardInRow(card);
    }
    this._refreshButtons();
  }

  _placeCardInRow(card) {
    // Find first free cell in current row
    let cellIdx = -1;
    for (let i = 0; i < this._currentRow; i++) {
      if (!this._rowOccupied.has(i)) { cellIdx = i; break; }
    }
    if (cellIdx === -1) return; // row full

    this._rowOccupied.add(cellIdx);
    this._hand.splice(this._hand.indexOf(card), 1);
    this._rowCards.push({ card, cellIdx });

    // Reflow remaining hand cards
    const { width, height } = this.scale;
    const safe = getSafeArea();
    const handCenterY = height - safe.bottom - MARGIN_V - BTN_AREA_H - PAD - (Card.HEIGHT + PAD) / 2;
    this._repositionHand(width, handCenterY, false);

    // Fly card to cell, scaled down
    const pos = this._gridRows[this._currentRow - 1].getCellWorldPos(cellIdx);
    if (pos) {
      this.tweens.add({
        targets: card, x: pos.x, y: pos.y, scaleX: CARD_SCALE, scaleY: CARD_SCALE,
        duration: 220, ease: 'Power2',
      });
    }
  }

  _returnCardToHand(entry) {
    const { card, cellIdx } = entry;
    card.setNonScoring(false);
    card.setSelected(false);
    this._rowOccupied.delete(cellIdx);
    this._rowCards.splice(this._rowCards.indexOf(entry), 1);
    this._hand.push(card);

    const { width, height } = this.scale;
    const safe = getSafeArea();
    const handCenterY = height - safe.bottom - MARGIN_V - BTN_AREA_H - PAD - (Card.HEIGHT + PAD) / 2;
    const gap    = 8;
    const totalW = this._hand.length * Card.WIDTH + (this._hand.length - 1) * gap;
    const startX = (width - totalW) / 2 + Card.WIDTH / 2;

    this._hand.forEach((c, i) => {
      const tx = startX + i * (Card.WIDTH + gap);
      if (c === card) {
        this.tweens.add({ targets: c, x: tx, y: handCenterY, scaleX: 1, scaleY: 1, duration: 220, ease: 'Power2' });
      } else {
        c.setPosition(tx, handCenterY);
      }
    });
  }

  /**
   * Animate non-scoring cards from the row back to the hand.
   * Returns the number of cards returned (0 if none).
   */
  _returnNonScoringToHand() {
    const counts = {};
    this._rowCards.forEach(({ card }) => { counts[card.cardValue] = (counts[card.cardValue] || 0) + 1; });
    const nonScoring = getNonScoringValues(counts);
    if (nonScoring.size === 0) return 0;

    const toReturn = this._rowCards.filter(e => nonScoring.has(e.card.cardValue));
    toReturn.forEach(entry => {
      entry.card.setNonScoring(false);
      this._returnCardToHand(entry);
    });
    return toReturn.length;
  }

  /** True when placed cards contain a 4-of-a-kind and redraw hasn't been used yet. */
  _is4oakRedraw() {
    if (this._redrawUsed || this._rowCards.length === 0 || this._hand.length === 0) return false;
    const counts = {};
    this._rowCards.forEach(({ card }) => { counts[card.cardValue] = (counts[card.cardValue] || 0) + 1; });
    return Object.values(counts).some(c => c === 4);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────────

  _onDraw() {
    if (this._state !== STATE_PLAYER || this._busy) return;
    this._busy = true;

    // Must place at least 1 card — drawing with empty row is a farkle
    if (this._rowCards.length === 0) { this._farkle(); return; }

    // 4-of-a-kind redraw: discard hand, deal fresh cards, stay in same row
    // Skip 4oak redraw when rigged — we want the normal draw→farkle flow
    if (this._is4oakRedraw() && !(RIGGED && this._currentRow === HAND_SIZE)) {
      this._redrawUsed = true;
      const numNew = this._hand.length;
      this._hand.forEach(c => { this._discard.push({ value: c.cardValue, suit: c.cardSuit }); c.destroy(); });
      this._hand = [];
      this._drawBtn.setEnabled(false);
      this._collectBtn.setEnabled(false);
      this.time.delayedCall(150, () => {
        this._dealCards(numNew);
        this.time.delayedCall(numNew * 70 + 350, () => {
          if (this._state !== STATE_PLAYER) return;
          this._busy = false;
          this._refreshButtons();
        });
      });
      return;
    }

    const counts = {};
    this._rowCards.forEach(({ card }) => { counts[card.cardValue] = (counts[card.cardValue] || 0) + 1; });
    const rowScore = calcScore(counts);
    if (rowScore === 0) return;

    this._collectBtn.setEnabled(false);
    this._drawBtn.setEnabled(false);

    // Rigged: drawing instead of collecting triggers farkle on next hand
    if (RIGGED && this._currentRow === HAND_SIZE) {
      this._riggedFarkle = true;
      console.log('[Rigged] Set _riggedFarkle = true, currentRow:', this._currentRow);
    }

    // Return non-scoring cards to hand first, then proceed
    const returned = this._returnNonScoringToHand();
    const delay = returned > 0 ? 350 : 0;

    this.time.delayedCall(delay, () => this._commitDraw(rowScore));
  }

  _commitDraw(rowScore) {
    const rowIdx = this._currentRow - 1;

    // Animate scoring cards locking into grid
    this._rowCards.forEach(({ card }, i) => {
      this._discard.push({ value: card.cardValue, suit: card.cardSuit });
      this.tweens.add({
        targets: card,
        scaleX: CARD_SCALE * 0.7, scaleY: CARD_SCALE * 0.7, alpha: 0,
        duration: 250, delay: i * 60, ease: 'Power2',
        onComplete: () => {
          this._gridRows[rowIdx].addCard(card.cardValue, card.cardSuit);
          card.destroy();
        },
      });
    });
    const cardCount = this._rowCards.length;
    this._rowCards    = [];
    this._rowOccupied = new Set();

    // Fade out hand cards
    this._nextDealCount = this._hand.length;
    this._hand.forEach(c => {
      this._discard.push({ value: c.cardValue, suit: c.cardSuit });
      this.tweens.add({
        targets: c, alpha: 0, y: c.y + 30,
        duration: 200, ease: 'Power2',
        onComplete: () => c.destroy(),
      });
    });
    this._hand = [];

    const animDone = cardCount * 60 + 300;
    this.time.delayedCall(animDone, () => {
      this._turnScore += rowScore;
      this._refreshRowScores();
      this._currentRow--;

      if (this._currentRow === 0) {
        this.time.delayedCall(300, () => {
          this._playerTotal += this._turnScore;
          this._turnScore = 0;
          this.time.delayedCall(600, () => this._startPlayerTurn());
        });
        return;
      }

      this.time.delayedCall(200, () => this._startRow());
    });
  }

  // ── Collect ───────────────────────────────────────────────────────────────────

  _onCollect() {
    if (this._state !== STATE_PLAYER || this._busy) return;

    // Compute row score from placed cards
    let rowScore = 0;
    if (this._rowCards.length > 0) {
      const counts = {};
      this._rowCards.forEach(({ card }) => { counts[card.cardValue] = (counts[card.cardValue] || 0) + 1; });
      rowScore = calcScore(counts);
    }

    if (this._turnScore === 0 && rowScore === 0) return;
    this._busy = true;
    this._collectBtn.setEnabled(false);
    this._drawBtn.setEnabled(false);

    // Return non-scoring cards to hand first, then proceed
    const returned = this._rowCards.length > 0 ? this._returnNonScoringToHand() : 0;
    const delay = returned > 0 ? 350 : 0;

    this.time.delayedCall(delay, () => this._commitCollect(rowScore));
  }

  _commitCollect(rowScore) {
    let animTime = 0;

    // Animate scoring placed cards locking into grid
    if (this._rowCards.length > 0 && rowScore > 0) {
      const rowIdx = this._currentRow - 1;
      this._turnScore += rowScore;
      this._rowCards.forEach(({ card }, i) => {
        this._discard.push({ value: card.cardValue, suit: card.cardSuit });
        this.tweens.add({
          targets: card,
          scaleX: CARD_SCALE * 0.7, scaleY: CARD_SCALE * 0.7, alpha: 0,
          duration: 250, delay: i * 60, ease: 'Power2',
          onComplete: () => {
            this._gridRows[rowIdx].addCard(card.cardValue, card.cardSuit);
            card.destroy();
          },
        });
      });
      animTime = this._rowCards.length * 60 + 300;
    } else {
      this._rowCards.forEach(({ card }) => { this._discard.push({ value: card.cardValue, suit: card.cardSuit }); card.destroy(); });
    }
    this._rowCards    = [];
    this._rowOccupied = new Set();

    // Fade out hand cards
    this._hand.forEach(c => {
      this._discard.push({ value: c.cardValue, suit: c.cardSuit });
      this.tweens.add({
        targets: c, alpha: 0, y: c.y + 30,
        duration: 200, ease: 'Power2',
        onComplete: () => c.destroy(),
      });
    });
    this._hand = [];

    this.time.delayedCall(Math.max(animTime, 250), () => {
      const collected = this._turnScore;
      this._playerTotal += this._turnScore;
      this._turnScore = 0;
      this._refreshScore();
      this._refreshRowScores();
      this._goodJob(collected, () => this._startPlayerTurn());
    });
  }

  // ── DOM Overlay helper ──────────────────────────────────────────────────────

  _createDomOverlay(bgColor) {
    const el = document.createElement('div');
    el.style.cssText =
      `position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;` +
      `align-items:center;justify-content:center;background:${bgColor};` +
      `opacity:0;transition:opacity 0.3s ease;pointer-events:none;`;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    return el;
  }

  _removeDomOverlay(el, onDone) {
    el.style.opacity = '0';
    el.addEventListener('transitionend', () => {
      el.remove();
      if (onDone) onDone();
    }, { once: true });
  }

  // ── Good Job ──────────────────────────────────────────────────────────────────

  _goodJob(points, onComplete) {
    this._busy = true;

    const el = this._createDomOverlay('rgba(10,110,42,0.9)');
    el.innerHTML =
      `<div style="font-size:52px;font-weight:bold;font-family:'MuseoSansRounded',Arial,sans-serif;` +
      `color:#fff;text-shadow:0 2px 6px rgba(0,0,0,0.5);transform:scale(0.5);` +
      `animation:__gjPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;">Good Job!</div>` +
      `<div style="font-size:24px;font-weight:bold;font-family:'MuseoSansRounded',Arial,sans-serif;` +
      `color:#f0e68c;text-shadow:0 1px 4px rgba(0,0,0,0.5);margin-top:8px;` +
      `opacity:0;animation:__gjFade 0.4s 0.2s ease forwards;">+${points.toLocaleString()} pts</div>`;

    // Inject keyframes if not already present
    if (!document.getElementById('__gj-keyframes')) {
      const style = document.createElement('style');
      style.id = '__gj-keyframes';
      style.textContent =
        '@keyframes __gjPop{to{transform:scale(1)}}' +
        '@keyframes __gjFade{to{opacity:1}}';
      document.head.appendChild(style);
    }

    this.time.delayedCall(1400, () => {
      this._removeDomOverlay(el, () => {
        this._busy = false;
        if (onComplete) onComplete();
      });
    });
  }

  // ── Farkle ────────────────────────────────────────────────────────────────────

  _farkle() {
    this._busy = true;
    this._collectBtn.setEnabled(false);
    this._drawBtn.setEnabled(false);

    const el = this._createDomOverlay('rgba(136,0,0,0.9)');
    el.innerHTML =
      `<img src="${this._farkleLogoUrl}" style="max-width:80%;height:auto;` +
      `transform:scale(0.5);animation:__gjPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;">` +
      `<div style="font-size:20px;font-weight:bold;font-family:'MuseoSansRounded',Arial,sans-serif;` +
      `color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.5);margin-top:16px;` +
      `opacity:0;animation:__gjFade 0.4s 0.2s ease forwards;">You lost all points!</div>`;

    // Inject keyframes if not already present
    if (!document.getElementById('__gj-keyframes')) {
      const style = document.createElement('style');
      style.id = '__gj-keyframes';
      style.textContent =
        '@keyframes __gjPop{to{transform:scale(1)}}' +
        '@keyframes __gjFade{to{opacity:1}}';
      document.head.appendChild(style);
    }

    // Redirect to store after overlay displays
    this.time.delayedCall(1800, () => {
      if (typeof window.__openStore === 'function') {
        window.__openStore();
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  _refreshScore() {
    const total = this._playerTotal + this._turnScore;
    this._scoreText.setText(total.toLocaleString());
    // Auto-scale to fit container width
    const maxW = 80; // scoreW (90) minus padding
    const scale = Math.min(1, maxW / this._scoreText.width);
    this._scoreText.setScale(scale);
  }

  _refreshRowScores() {
    this._gridRows.forEach((row, i) => {
      const rowIdx = i + 1; // rows are 1-indexed
      const sets = row.sets;
      const counts = {};
      for (const [v, c] of Object.entries(sets)) counts[Number(v)] = c;

      // Include uncommitted placed cards for the active row
      if (rowIdx === this._currentRow && this._rowCards.length > 0) {
        this._rowCards.forEach(({ card }) => {
          counts[card.cardValue] = (counts[card.cardValue] || 0) + 1;
        });
      }

      const entries = Object.entries(counts);
      if (entries.length === 0) {
        this._rowScoreLabels[i].setText('');
        return;
      }
      const score = calcScore(counts);
      this._rowScoreLabels[i].setText(score > 0 ? `+${score}` : '');
    });
  }

  _refreshButtons() {
    const isPlayer = this._state === STATE_PLAYER;
    let rowScore = 0;
    let nonScoring = new Set();
    if (this._rowCards.length > 0) {
      const counts = {};
      this._rowCards.forEach(({ card }) => { counts[card.cardValue] = (counts[card.cardValue] || 0) + 1; });
      rowScore = calcScore(counts);
      nonScoring = getNonScoringValues(counts);
    }
    // Mark non-scoring cards red
    this._rowCards.forEach(({ card }) => {
      card.setNonScoring(nonScoring.has(card.cardValue));
    });

    const is4oak = this._is4oakRedraw();
    const drawEnabled = isPlayer && this._rowCards.length > 0 && (rowScore > 0 || is4oak);
    this._drawBtn.setEnabled(drawEnabled);
    const canCollect = isPlayer && (this._turnScore > 0 || rowScore > 0);
    this._collectBtn.setEnabled(canCollect);
    const totalPending = this._turnScore + rowScore;
    this._collectBtn.setSubLabel(totalPending > 0 ? `+${totalPending.toLocaleString()} pts` : '');
    this._refreshScore();
    this._refreshRowScores();
  }

  update() {}
}
