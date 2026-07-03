import { Scene } from "phaser";
import { ResponsiveHandler } from "@/libs/responsive";
import { LANG, isRTL } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { ZOrder } from "@/config/zorder";
import { getGameData } from "@/core/data";
import { fitScreen } from "@/utils/responsive";
import { fitText, padArabic } from "@/utils/layout";
import { setInteractive } from "@/utils/interactive";
import { AnimationManager } from "@/libs/animation";

// The Start screen shown over the (paused) grid: title, instruction and a blue
// Play button. Matches the source's intro.
export class TitleScene extends Scene {
  private responsive?: ResponsiveHandler;
  private anim!: AnimationManager;
  private overlay!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private instruction!: Phaser.GameObjects.Text;
  private playBtn!: Phaser.GameObjects.Container;
  private playBg!: Phaser.GameObjects.Graphics;
  private playText!: Phaser.GameObjects.Text;
  private playTri!: Phaser.GameObjects.Triangle;

  constructor() {
    super("Title");
  }

  init() {
    this.responsive = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.anim = new AnimationManager(this);

    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.82).setDepth(ZOrder.OVERLAY - 1);
    this.headerText = this.add
      .text(0, 0, LANG.START_HEADER, { fontFamily: FONT_FAMILY.BOLD, color: "#ffffff" })
      .setOrigin(0.5)
      .setRTL(isRTL())
      .setDepth(ZOrder.OVERLAY);
    this.title = this.add
      .text(0, 0, getGameData().title || "", { fontFamily: FONT_FAMILY.BOLD, color: "#ffffff", align: "center" })
      .setOrigin(0.5)
      .setRTL(isRTL())
      .setDepth(ZOrder.OVERLAY);
    this.instruction = this.add
      .text(0, 0, LANG.START_INSTRUCTION, { fontFamily: FONT_FAMILY.REGULAR, color: "#e6e6e6", align: "center" })
      .setOrigin(0.5)
      .setRTL(isRTL())
      .setDepth(ZOrder.OVERLAY);

    this.playBg = this.add.graphics();
    this.playTri = this.add.triangle(0, 0, 0, 0, 0, 40, 34, 20, 0xffffff);
    this.playText = this.add
      .text(0, 0, LANG.START_PLAY, { fontFamily: FONT_FAMILY.BOLD, color: "#ffffff" })
      .setOrigin(0.5)
      .setRTL(isRTL());
    this.playBtn = this.add.container(0, 0, [this.playBg, this.playTri, this.playText]).setDepth(ZOrder.OVERLAY);
    setInteractive(this.playBtn, this.input);
    this.playBtn.on(Phaser.Input.Events.POINTER_OVER, () => this.playBtn.setScale(1.05));
    this.playBtn.on(Phaser.Input.Events.POINTER_OUT, () => this.playBtn.setScale(1));
    this.playBtn.on(Phaser.Input.Events.POINTER_DOWN, () =>
      this.anim.playButtonPress(this.playBtn, { sfx: "sfx-open" }).then(() => this.start())
    );

    this.handleResponsive();

    // Staggered intro: title text slides+fades in, then the play button pops.
    this.anim.screenIntro([this.headerText, this.title, this.instruction], { slide: 50, stagger: 110 });
    this.playBtn.setScale(0);
    this.tweens.add({ targets: this.playBtn, scale: 1, duration: 400, delay: 460, ease: "Back.easeOut" });
  }

  private start() {
    // No background music — sound effects only.
    this.scene.stop();
    this.scene.resume("Grid");
  }

  private handleResponsive() {
    if (!this.responsive) return;
    this.responsive.events.on("resize", () => this.layout());
    this.responsive.trigger();
  }

  private layout() {
    const [width, height] = fitScreen(this.scale);
    this.overlay.setPosition(width / 2, height / 2).setSize(width, height);

    this.headerText.setPosition(width / 2, height * 0.09);
    fitText(this.headerText, width * 0.5, height * 0.08, { max: Math.round(height * 0.045) });

    this.title.setPosition(width / 2, height * 0.26);
    fitText(this.title, width * 0.88, height * 0.2, { max: Math.round(height * 0.085) });

    this.instruction.setPosition(width / 2, height * 0.85);
    fitText(this.instruction, width * 0.84, height * 0.08, { max: Math.round(height * 0.038) });

    // Blue play button.
    const bw = Math.min(width * 0.34, height * 0.26);
    const bh = bw * 0.62;
    this.playBg.clear();
    this.playBg.fillStyle(0x000000, 0.3).fillRoundedRect(-bw / 2 + 4, -bh / 2 + 6, bw, bh, 16);
    this.playBg.fillStyle(0x33a9e0, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);
    this.playTri.setPosition(0, -bh * 0.12).setScale(bh / 60);
    this.playText.setPosition(0, bh * 0.28).setFontSize(Math.round(bh * 0.2));
    padArabic(this.playText);
    this.playBtn.setSize(bw, bh).setPosition(width / 2, height / 2);
  }

  private onShutdown() {
    this.responsive?.destroy();
    this.responsive = undefined;
  }
}
