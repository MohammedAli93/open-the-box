import { ResponsiveHandler } from "@/libs/responsive";
import { setInteractive } from "@/utils/interactive";
import { DPR, fitScreen } from "@/utils/responsive";
import { State } from "@/core/state";
import { FONT_FAMILY } from "@/config/text";
import { getGameData, getMode } from "@/core/data";
import { ZOrder } from "@/config/zorder";

// Ported from the previous game: menu / fullscreen / audio icon buttons in the
// bottom corners (menu → Menu overlay, audio → Audio overlay). Plus the live
// score (quiz mode) top-right.
export class UIScene extends Phaser.Scene {
  responsiveHandler?: ResponsiveHandler;
  private scoreIcon?: Phaser.GameObjects.Image;
  private scoreText?: Phaser.GameObjects.Text;
  private lastScore = -1;
  private showScore = true;

  constructor() {
    super("UI");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, this.handleFullscreen, this);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.handleFullscreen, this);

    const menu = this.add.image(0, 0, "ui-menu").setName("menu").setAlpha(0.75).setDepth(ZOrder.UI);
    setInteractive(menu, this.input);
    menu.on(Phaser.Input.Events.POINTER_OVER, () => menu.setAlpha(1.0));
    menu.on(Phaser.Input.Events.POINTER_OUT, () => menu.setAlpha(0.75));
    menu.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.setVisible(false);
      ["Grid", "Question", "Reveal", "Complete"].forEach((k) => this.scene.pause(k));
      this.scene.launch("Menu");
    });

    const fullscreen = this.add.image(0, 0, "ui-fullscreen").setName("fullscreen").setAlpha(0.75).setDepth(ZOrder.UI);
    setInteractive(fullscreen, this.input);
    fullscreen.on(Phaser.Input.Events.POINTER_OVER, () => fullscreen.setAlpha(1.0));
    fullscreen.on(Phaser.Input.Events.POINTER_OUT, () => fullscreen.setAlpha(0.75));
    fullscreen.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (fullscreen.texture.key === "ui-fullscreen") {
        this.scale.startFullscreen();
      } else {
        this.scale.stopFullscreen();
      }
    });

    const audio = this.add.image(0, 0, "ui-audio").setName("audio").setAlpha(0.75).setDepth(ZOrder.UI);
    setInteractive(audio, this.input);
    audio.on(Phaser.Input.Events.POINTER_OVER, () => audio.setAlpha(1.0));
    audio.on(Phaser.Input.Events.POINTER_OUT, () => audio.setAlpha(0.75));
    audio.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.setVisible(false);
      ["Grid", "Question", "Reveal", "Complete"].forEach((k) => this.scene.pause(k));
      this.scene.launch("Audio");
    });

    this.showScore = getMode(getGameData()) === "quiz";
    if (this.showScore) {
      this.scoreIcon = this.add.image(0, 0, "correct-small").setDepth(ZOrder.UI);
      this.scoreText = this.add
        .text(0, 0, "0", { fontFamily: FONT_FAMILY.BOLD, color: "#ffffff" })
        .setOrigin(0.5)
        .setRTL(true)
        .setDepth(ZOrder.UI);
    }

    this.handleResponsive();
  }

  update() {
    if (this.showScore && this.scoreText && State.score !== this.lastScore) {
      this.lastScore = State.score;
      this.scoreText.setText(String(this.lastScore));
    }
  }

  onShutdown() {
    this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, this.handleFullscreen, this);
    this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.handleFullscreen, this);
    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
    this.lastScore = -1;
  }

  handleFullscreen() {
    const fullscreen = this.children.getByName("fullscreen") as Phaser.GameObjects.Image;
    if (!fullscreen) return;
    fullscreen.setTexture(this.scale.isFullscreen ? "ui-fullscreen-exit" : "ui-fullscreen");
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const menu = this.children.getByName("menu") as Phaser.GameObjects.Image;
    const fullscreen = this.children.getByName("fullscreen") as Phaser.GameObjects.Image;
    const audio = this.children.getByName("audio") as Phaser.GameObjects.Image;

    const place = (mobile: boolean) => {
      const [width, height] = fitScreen(this.scale);
      const isIpad = width > 900 && height > 900;
      const scale = mobile && !isIpad ? 0.5 * DPR : 1.0;
      const offset = mobile ? 2 : 10;

      menu.setScale(scale).setPosition(offset + menu.displayWidth / 2, height - (offset + menu.displayHeight / 2));
      fullscreen
        .setScale(scale)
        .setPosition(width - offset - fullscreen.displayWidth / 2, height - (offset + fullscreen.displayHeight / 2));
      audio
        .setScale(scale)
        .setPosition(fullscreen.x - offset - audio.displayWidth, height - (offset + audio.displayHeight / 2));

      if (this.scoreIcon && this.scoreText) {
        const s = 40 * DPR;
        this.scoreIcon.setDisplaySize(s, s);
        this.scoreText.setFontSize(34 * DPR);
        this.scoreText.setPosition(width - offset * 2 - this.scoreText.width / 2, offset * 2 + s / 2);
        this.scoreIcon.setPosition(this.scoreText.x - this.scoreText.width / 2 - s * 0.7, offset * 2 + s / 2);
      }
    };

    this.responsiveHandler.events.on("resize", () => place(false));
    this.responsiveHandler.events.on("mobile", () => place(true));
    this.responsiveHandler.trigger();
  }
}
