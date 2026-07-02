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
    // Only swap the icon — Phaser's RESIZE mode fires its own resize on the
    // fullscreen change, which re-runs the layout (matches the previous game).
    const fullscreen = this.children.getByName("fullscreen") as Phaser.GameObjects.Image;
    if (!fullscreen) return;
    fullscreen.setTexture(this.scale.isFullscreen ? "ui-fullscreen-exit" : "ui-fullscreen");
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const menu = this.children.getByName("menu") as Phaser.GameObjects.Image;
    const fullscreen = this.children.getByName("fullscreen") as Phaser.GameObjects.Image;
    const audio = this.children.getByName("audio") as Phaser.GameObjects.Image;

    // Icons sized as a fraction of the screen so they scale with the window and
    // in fullscreen (like the source), and tucked tight into the corners.
    const place = () => {
      const [width, height] = fitScreen(this.scale);
      // Small icons pinned to the very bottom corners (bottom of the page, incl.
      // fullscreen); the sound icon is a touch smaller.
      const icon = Phaser.Math.Clamp(Math.min(width, height) * 0.036, 18 * DPR, 30 * DPR);
      const sound = icon * 0.85;
      const pad = Phaser.Math.Clamp(height * 0.013, 8, 22);
      const cy = height - pad - icon / 2;

      menu.setOrigin(0.5).setDisplaySize(icon, icon).setPosition(pad + icon / 2, cy);
      fullscreen.setOrigin(0.5).setDisplaySize(icon, icon).setPosition(width - pad - icon / 2, cy);
      audio
        .setOrigin(0.5)
        .setDisplaySize(sound, sound)
        .setPosition(fullscreen.x - icon / 2 - pad - sound / 2, cy - icon * 0.18);

      if (this.scoreIcon && this.scoreText) {
        const s = icon;
        this.scoreIcon.setDisplaySize(s, s);
        this.scoreText.setFontSize(Math.round(s * 0.85));
        this.scoreText.setPosition(width - pad - this.scoreText.width / 2, pad + s / 2);
        this.scoreIcon.setPosition(this.scoreText.x - this.scoreText.width / 2 - s * 0.7, pad + s / 2);
      }
    };

    this.responsiveHandler.events.on("resize", () => place());
    this.responsiveHandler.events.on("mobile", () => place());
    this.responsiveHandler.trigger();
  }
}
