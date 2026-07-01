import { Scene } from "phaser";
import { ResponsiveHandler } from "@/libs/responsive";
import { State } from "@/core/state";
import { getGameData, getMode } from "@/core/data";
import { LANG } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { ZOrder } from "@/config/zorder";
import { FEEDBACK } from "@/config/colors";
import { fitScreen } from "@/utils/responsive";
import { fitText } from "@/utils/layout";
import { setInteractive } from "@/utils/interactive";
import { arabicNum } from "@/utils/arabic";

export class CompleteScene extends Scene {
  private responsive?: ResponsiveHandler;
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Graphics;
  private header!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private button!: Phaser.GameObjects.Container;
  private buttonBg!: Phaser.GameObjects.Graphics;
  private buttonText!: Phaser.GameObjects.Text;

  constructor() {
    super("Complete");
  }

  init() {
    this.responsive = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.62).setDepth(ZOrder.OVERLAY - 1);
    this.panel = this.add.container(0, 0).setDepth(ZOrder.OVERLAY);
    this.bg = this.add.graphics();
    this.panel.add(this.bg);

    this.header = this.add
      .text(0, 0, LANG.COMPLETE_HEADER, { fontFamily: FONT_FAMILY.BOLD, color: "#2a2a2a" })
      .setOrigin(0.5)
      .setRTL(true);
    const total = getGameData().questions.length;
    // Quiz mode shows "score / total"; reveal mode shows a "done" message.
    // NOTE: in the Canvas renderer the Arabic font only paints when the Text is
    // RTL; RTL also reverses token order, so the operands are written
    // total-first to display as "score / total".
    const scoreLabel =
      getMode(getGameData()) === "quiz"
        ? `${arabicNum(total)} / ${arabicNum(State.score)}`
        : LANG.COMPLETE_DONE;
    this.scoreText = this.add
      .text(0, 0, scoreLabel, {
        fontFamily: FONT_FAMILY.BOLD,
        color: "#1c7a45",
        align: "center",
      })
      .setOrigin(0.5)
      .setRTL(true);
    this.panel.add([this.header, this.scoreText]);

    this.button = this.add.container(0, 0);
    this.buttonBg = this.add.graphics();
    this.buttonText = this.add
      .text(0, 0, LANG.COMPLETE_RESTART, { fontFamily: FONT_FAMILY.BOLD, color: "#ffffff" })
      .setOrigin(0.5)
      .setRTL(true);
    this.button.add([this.buttonBg, this.buttonText]);
    this.panel.add(this.button);
    setInteractive(this.button, this.input);
    this.button.on(Phaser.Input.Events.POINTER_OVER, () => this.button.setScale(1.05));
    this.button.on(Phaser.Input.Events.POINTER_OUT, () => this.button.setScale(1));
    this.button.on(Phaser.Input.Events.POINTER_DOWN, () => this.restart());

    this.handleResponsive();

    this.panel.setScale(0);
    this.tweens.add({ targets: this.panel, scale: 1, duration: 320, ease: "Back.easeOut" });
  }

  private restart() {
    this.scene.stop("UI");
    this.scene.stop("Question");
    this.scene.stop();
    this.scene.start("Grid");
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

    const W = Math.min(width * 0.8, 620);
    const H = Math.min(height * 0.7, 520);
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.25).fillRoundedRect(-W / 2 + 6, -H / 2 + 10, W, H, 26);
    this.bg.fillStyle(0xfdf6e9, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 26);

    this.header.setPosition(0, -H * 0.3);
    fitText(this.header, W * 0.8, H * 0.18, { max: Math.round(H * 0.16) });

    this.scoreText.setPosition(0, -H * 0.02);
    fitText(this.scoreText, W * 0.7, H * 0.26, { max: Math.round(H * 0.24) });

    const bw = W * 0.6;
    const bh = H * 0.16;
    this.buttonBg.clear();
    this.buttonBg.fillStyle(FEEDBACK.correct, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    this.button.setSize(bw, bh).setPosition(0, H * 0.3);
    fitText(this.buttonText, bw * 0.85, bh * 0.6, { max: Math.round(bh * 0.55) });
  }

  private onShutdown() {
    this.responsive?.destroy();
    this.responsive = undefined;
  }
}
