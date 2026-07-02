import { ResponsiveHandler } from "@/libs/responsive";
import { setInteractive } from "@/utils/interactive";
import { DPR, fitScreen } from "@/utils/responsive";
import { State } from "@/core/state";
import { FONT_FAMILY } from "@/config/text";
import { getGameData, getMode } from "@/core/data";
import { ZOrder } from "@/config/zorder";
import { AudioManager } from "@/libs/audio";

// Ported from the previous game: menu / fullscreen / audio icon buttons in the
// bottom corners (menu → Menu overlay, audio → Audio overlay). Plus the live
// score (quiz mode) top-right.
export class UIScene extends Phaser.Scene {
  responsiveHandler?: ResponsiveHandler;
  private scoreIcon?: Phaser.GameObjects.Image;
  private scoreText?: Phaser.GameObjects.Text;
  private lastScore = -1;
  private showScore = true;
  // Global countdown (quiz mode): runs continuously across the grid + questions.
  private timerTotal = 0;
  private timerBar?: Phaser.GameObjects.Graphics;
  private timerText?: Phaser.GameObjects.Text;
  private timerX = 0;
  private timerY = 0;
  private timerW = 0;
  private timerH = 0;

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
      ["Grid", "Complete"].forEach((k) => this.scene.pause(k));
      this.scene.launch("Menu");
    });

    const fullscreen = this.add.image(0, 0, "ui-fullscreen").setName("fullscreen").setAlpha(0.75).setDepth(ZOrder.UI);
    setInteractive(fullscreen, this.input);
    fullscreen.on(Phaser.Input.Events.POINTER_OVER, () => fullscreen.setAlpha(1.0));
    fullscreen.on(Phaser.Input.Events.POINTER_OUT, () => fullscreen.setAlpha(0.75));
    fullscreen.on(Phaser.Input.Events.POINTER_DOWN, () => {
      // Toggle on the actual state so it always exits fullscreen when in it.
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });

    const audio = this.add.image(0, 0, "ui-audio").setName("audio").setAlpha(0.75).setDepth(ZOrder.UI);
    setInteractive(audio, this.input);
    audio.on(Phaser.Input.Events.POINTER_OVER, () => audio.setAlpha(1.0));
    audio.on(Phaser.Input.Events.POINTER_OUT, () => audio.setAlpha(0.75));
    audio.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.setVisible(false);
      ["Grid", "Complete"].forEach((k) => this.scene.pause(k));
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

    // Global countdown bar + seconds (quiz mode only).
    this.timerTotal = this.showScore ? Math.max(0, getGameData().timerSeconds ?? 0) : 0;
    if (this.timerTotal > 0) {
      this.timerBar = this.add.graphics().setDepth(ZOrder.UI).setVisible(false);
      this.timerText = this.add
        .text(0, 0, String(this.timerTotal), { fontFamily: FONT_FAMILY.BOLD, color: "#ffffff" })
        .setOrigin(0, 0)
        .setDepth(ZOrder.UI)
        .setVisible(false);
    }

    this.handleResponsive();
  }

  update(_time: number, delta: number) {
    if (this.showScore && this.scoreText && State.score !== this.lastScore) {
      this.lastScore = State.score;
      this.scoreText.setText(String(this.lastScore));
    }
    this.updateTimer(delta);
  }

  private updateTimer(delta: number) {
    if (!this.timerBar || !this.timerText) return;
    // Runs only once the game has started, while the UI is visible (hidden during
    // the menu/audio overlays) and the results aren't up.
    const active = State.timerActive && this.scene.isVisible() && !this.scene.isActive("Complete");
    this.timerBar.setVisible(active);
    this.timerText.setVisible(active);
    if (!active) return;
    State.timerRemaining -= delta / 1000;
    if (State.timerRemaining <= 0) {
      State.timerRemaining = 0;
      this.drawTimer();
      this.gameOver();
      return;
    }
    this.drawTimer();
  }

  private drawTimer() {
    if (!this.timerBar || !this.timerText || this.timerW <= 0) return;
    const frac = Phaser.Math.Clamp(State.timerRemaining / Math.max(1, this.timerTotal), 0, 1);
    const color = frac > 0.5 ? 0x2e9e5b : frac > 0.25 ? 0xe1a92b : 0xc0392b;
    const h = this.timerH;
    this.timerBar.clear();
    this.timerBar.fillStyle(0x000000, 0.28).fillRoundedRect(this.timerX, this.timerY, this.timerW, h, h / 2);
    this.timerBar.fillStyle(color, 1).fillRoundedRect(this.timerX, this.timerY, Math.max(h, this.timerW * frac), h, h / 2);
    this.timerText.setText(String(Math.ceil(State.timerRemaining)));
  }

  private gameOver() {
    if (State.timedOut) return;
    State.timedOut = true;
    State.timerActive = false;
    ["Grid"].forEach((k) => this.scene.isActive(k) && this.scene.pause(k));
    AudioManager.playSFX(this.sound, "sfx-wrong");
    this.scene.launch("Complete");
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
    // Re-run every scene's layout against the new size so panels (e.g. the Start
    // screen) fill the fullscreen.
    this.scale.refresh();
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
      const pad = Phaser.Math.Clamp(height * 0.013, 8, 22);
      const cy = height - pad - icon / 2;

      menu.setOrigin(0.5).setDisplaySize(icon, icon).setPosition(pad + icon / 2, cy);
      fullscreen.setOrigin(0.5).setDisplaySize(icon, icon).setPosition(width - pad - icon / 2, cy);
      audio.setOrigin(0.5).setDisplaySize(icon, icon).setPosition(fullscreen.x - icon - pad, cy);

      if (this.scoreIcon && this.scoreText) {
        const s = icon;
        this.scoreIcon.setDisplaySize(s, s);
        this.scoreText.setFontSize(Math.round(s * 0.85));
        this.scoreText.setPosition(width - pad - this.scoreText.width / 2, pad + s / 2);
        this.scoreIcon.setPosition(this.scoreText.x - this.scoreText.width / 2 - s * 0.7, pad + s / 2);
      }

      if (this.timerBar && this.timerText) {
        // Seconds number top-left; half-width bar centered and raised near the top.
        this.timerH = Phaser.Math.Clamp(Math.min(width, height) * 0.014, 8, 22);
        const numSize = Phaser.Math.Clamp(Math.min(width, height) * 0.045, 24, 56);
        const m = Math.max(10, width * 0.012);
        this.timerText.setFontSize(Math.round(numSize)).setPosition(m, m);
        this.timerW = width * 0.5;
        this.timerX = (width - this.timerW) / 2;
        this.timerY = Math.max(8, height * 0.012);
        this.drawTimer();
      }
    };

    this.responsiveHandler.events.on("resize", () => place());
    this.responsiveHandler.events.on("mobile", () => place());
    this.responsiveHandler.trigger();
  }
}
