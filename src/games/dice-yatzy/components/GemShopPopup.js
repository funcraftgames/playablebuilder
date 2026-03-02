const STYLE = {
  fontFamily:    'DynaPuff, Arial, sans-serif',
  overlayColor:  0x000000,
  overlayAlpha:  0.72,
  panelColor:    '#0d2a18',
  panelBorder:   '#44cc88',
  panelWidth:    320,
  panelRadius:   18,
  titleColor:    '#ffffff',
  titleFontSize: '22px',
  rowBgEven:     '#1a3a28',
  rowBgOdd:      '#132b1e',
  rowTextColor:  '#e0f5ea',
  rowFontSize:   '20px',
  rowHeight:     56,
  btnColor:      '#ffffff',
  btnHover:      '#666666',
  btnBorder:     '#888888',
  btnTextColor:  '#cccccc',
  btnFontSize:   '14px',
  gemBtnColor:   '#1a7a44',
  gemBtnHover:   '#22aa5e',
  gemBtnBorder:  '#44cc88',
  gemBtnShadow:  '#052a12',
};

const toHex = (str) => parseInt(str.replace('#', ''), 16);

const PACKAGES = [
  { gems: 100,  price: '$1.99',  label: '100 💎',  sub: '$1.99 USD' },
  { gems: 1000, price: '$14.99', label: '1000 💎', sub: '$14.99 USD' },
];

export default class GemShopPopup extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Function} onBuy  - called with (gems) when a package is tapped
   * @param {Function} onClose
   */
  /**
   * @param {Phaser.Scene} scene
   * @param {Function} onBuy
   * @param {Function} onClose
   * @param {string} [title] - Optional custom title
   */
  constructor(scene, onBuy, onClose, title = 'Not enough 💎') {
    super(scene, 0, 0);

    const { width, height } = scene.scale;

    // Dim overlay
    const overlay = scene.add.graphics();
    overlay.fillStyle(STYLE.overlayColor, STYLE.overlayAlpha);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    this.add(overlay);

    const pw = STYLE.panelWidth;
    const px = (width - pw) / 2;
    const titleH = 60;
    const rowsH  = PACKAGES.length * STYLE.rowHeight;
    const footH  = 56;
    const ph     = titleH + rowsH + footH + 20;
    const py     = (height - ph) / 2;

    // Panel background
    const panel = scene.add.graphics();
    panel.fillStyle(toHex(STYLE.panelColor), 1);
    panel.fillRoundedRect(px, py, pw, ph, STYLE.panelRadius);
    panel.lineStyle(2, toHex(STYLE.panelBorder), 0.9);
    panel.strokeRoundedRect(px, py, pw, ph, STYLE.panelRadius);
    this.add(panel);

    // Title
    const titleText = scene.add.text(px + pw / 2, py + titleH / 2, title, {
      fontSize:        STYLE.titleFontSize,
      color:           STYLE.titleColor,
      fontFamily:      STYLE.fontFamily,
      fontStyle:       'bold',
      stroke:          '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.add(titleText);

    // Divider under title
    const div = scene.add.graphics();
    div.lineStyle(1, toHex(STYLE.panelBorder), 0.4);
    div.lineBetween(px + 16, py + titleH, px + pw - 16, py + titleH);
    this.add(div);

    // Package rows
    PACKAGES.forEach((pkg, i) => {
      const rowY = py + titleH + i * STYLE.rowHeight;
      const rowColor = i % 2 === 0 ? STYLE.rowBgEven : STYLE.rowBgOdd;

      const rowBg = scene.add.graphics();
      rowBg.fillStyle(toHex(rowColor), 1);
      rowBg.fillRect(px, rowY, pw, STYLE.rowHeight);
      this.add(rowBg);

      // Gem label (left)
      const lbl = scene.add.text(px + 16, rowY + STYLE.rowHeight / 2 - 9, pkg.label, {
        fontSize:   STYLE.rowFontSize,
        color:      STYLE.rowTextColor,
        fontFamily: STYLE.fontFamily,
        fontStyle:  'bold',
      }).setOrigin(0, 0.5);
      this.add(lbl);

      // Price sub-label
      const sub = scene.add.text(px + 16, rowY + STYLE.rowHeight / 2 + 9, pkg.sub, {
        fontSize:   '11px',
        color:      '#d9d9d9',
        fontFamily: STYLE.fontFamily,
      }).setOrigin(0, 0.5);
      this.add(sub);

      // Buy button (right)
      const btnW = 74, btnH = 32, btnR = 10;
      const btnX = px + pw - btnW - 12;
      const btnCY = rowY + STYLE.rowHeight / 2;

      const btnGfx = scene.add.graphics();
      const drawBuyBtn = (hover) => {
        btnGfx.clear();
        btnGfx.fillStyle(toHex(STYLE.gemBtnShadow), 1);
        btnGfx.fillRoundedRect(btnX, btnCY - btnH / 2 + 4, btnW, btnH, btnR);
        btnGfx.fillStyle(toHex(hover ? STYLE.gemBtnHover : STYLE.gemBtnColor), 1);
        btnGfx.fillRoundedRect(btnX, btnCY - btnH / 2, btnW, btnH, btnR);
        btnGfx.lineStyle(1, toHex(STYLE.gemBtnBorder), 0.9);
        btnGfx.strokeRoundedRect(btnX, btnCY - btnH / 2, btnW, btnH, btnR);
      };
      drawBuyBtn(false);
      this.add(btnGfx);

      const btnTxt = scene.add.text(btnX + btnW / 2, btnCY, pkg.price, {
        fontSize:        '20px',
        color:           '#ffffff',
        fontFamily:      STYLE.fontFamily,
        fontStyle:       'bold',
        stroke:          '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      this.add(btnTxt);

      const hit = scene.add
        .zone(btnX + btnW / 2, btnCY, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover',  () => drawBuyBtn(true));
      hit.on('pointerout',   () => drawBuyBtn(false));
      hit.on('pointerdown',  () => {
        if (onBuy) onBuy(pkg.gems);
        this.close();
      });
      this.add(hit);
    });

    // "No, thanks" link
    const linkY = py + titleH + PACKAGES.length * STYLE.rowHeight + 24;
    const link = scene.add.text(px + pw / 2, linkY, 'No, thanks', {
      fontSize:   STYLE.btnFontSize,
      color:      '#44cc88',
      fontFamily: STYLE.fontFamily,
      fontStyle:  'bold',
      underline:  true,
    }).setOrigin(0.5);
    link.setInteractive({ useHandCursor: true });
    link.on('pointerdown', () => {
      if (onClose) onClose();
      this.close();
    });
    this.add(link);

    scene.add.existing(this);
  }

  close() {
    this.destroy();
  }
}
