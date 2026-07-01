import { Scene } from "phaser";
import { ResponsiveHandler } from "@/libs/responsive";
import { type Question } from "@/core/data";
import { ZOrder } from "@/config/zorder";
import { FONT_FAMILY } from "@/config/text";
import { LANG } from "@/config/lang";
import { fitScreen } from "@/utils/responsive";
import { fitText, fitImage } from "@/utils/layout";

interface RevealSceneData {
  index: number;
  item: Question;
  onResolve: () => void;
}

// Reveal mode: a box has been opened, so show the item inside (text and/or image)
// on a card. Tapping anywhere continues (folds the box back on the grid).
export class RevealScene extends Scene {
  private responsive?: ResponsiveHandler;
  private sceneData!: RevealSceneData;
  private item!: Question;
  private closing = false;

  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Container;
  private cardBg!: Phaser.GameObjects.Graphics;
  private text?: Phaser.GameObjects.Text;
  private picture?: Phaser.GameObjects.Image;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super("Reveal");
  }

  init(data: RevealSceneData) {
    this.sceneData = data;
    this.item = data.item;
    this.closing = false;
    this.responsive = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.55).setOrigin(0.5).setDepth(ZOrder.QUESTION - 1);

    this.panel = this.add.container(0, 0).setDepth(ZOrder.QUESTION);
    this.cardBg = this.add.graphics();
    this.panel.add(this.cardBg);

    if (this.item.text) {
      this.text = this.add
        .text(0, 0, this.item.text, { fontFamily: FONT_FAMILY.BOLD, color: "#222222", align: "center" })
        .setOrigin(0.5)
        .setRTL(true);
      this.panel.add(this.text);
    }
    if (this.item.image) {
      this.picture = this.add.image(0, 0, this.item.image).setOrigin(0.5);
      this.panel.add(this.picture);
    }

    this.hint = this.add
      .text(0, 0, LANG.REVEAL_NEXT, { fontFamily: FONT_FAMILY.REGULAR, color: "#7a6a4a" })
      .setOrigin(0.5)
      .setRTL(true);
    this.panel.add(this.hint);

    this.handleResponsive();

    this.panel.setScale(0);
    this.tweens.add({ targets: this.panel, scale: 1, duration: 280, ease: "Back.easeOut" });

    // Tap anywhere to continue (after a short grace so the reveal is seen).
    this.time.delayedCall(450, () => {
      this.input.once(Phaser.Input.Events.POINTER_DOWN, () => this.close());
    });
  }

  private close() {
    if (this.closing) return;
    this.closing = true;
    this.tweens.add({
      targets: this.panel,
      scale: 0,
      alpha: 0,
      duration: 220,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.sceneData.onResolve();
        this.scene.stop();
      },
    });
  }

  private handleResponsive() {
    if (!this.responsive) return;
    this.responsive.events.on("resize", () => this.layout());
    this.responsive.trigger();
  }

  private layout() {
    const [width, height] = fitScreen(this.scale);
    this.overlay.setPosition(width / 2, height / 2).setSize(width, height);
    this.panel.setPosition(width / 2, height / 2);

    const W = Math.min(width * 0.9, 980);
    const H = Math.min(height * 0.85, 760);
    const pad = Math.min(W, H) * 0.06;

    this.cardBg.clear();
    this.cardBg.fillStyle(0x000000, 0.25).fillRoundedRect(-W / 2 + 6, -H / 2 + 10, W, H, 28);
    this.cardBg.fillStyle(0xfdf6e9, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 28);
    this.cardBg.lineStyle(3, 0xe3d6bd, 1).strokeRoundedRect(-W / 2, -H / 2, W, H, 28);

    const hintH = H * 0.12;
    const contentTop = -H / 2 + pad;
    const contentH = H - pad * 2 - hintH;
    const contentW = W - pad * 2;
    const both = !!this.text && !!this.picture;

    if (this.picture) {
      const imgH = both ? contentH * 0.55 : contentH;
      const imgY = contentTop + imgH / 2;
      fitImage(this.picture, contentW * 0.95, imgH * 0.95);
      this.picture.setPosition(0, imgY);
    }
    if (this.text) {
      const txtH = both ? contentH * 0.4 : contentH;
      const txtY = both ? contentTop + contentH * 0.78 : contentTop + contentH / 2;
      fitText(this.text, contentW, txtH, { max: Math.round(H * (both ? 0.18 : 0.3)) });
      this.text.setPosition(0, txtY);
    }

    this.hint.setPosition(0, H / 2 - hintH / 2 - pad * 0.3);
    fitText(this.hint, contentW * 0.8, hintH * 0.5, { max: Math.round(H * 0.045) });
  }

  private onShutdown() {
    this.responsive?.destroy();
    this.responsive = undefined;
  }
}
