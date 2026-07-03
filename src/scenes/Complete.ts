import { Scene } from "phaser";
import { ResponsiveHandler } from "@/libs/responsive";
import { State } from "@/core/state";
import { getGameData, getMode } from "@/core/data";
import { LANG, isRTL, scorePair } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { ZOrder } from "@/config/zorder";
import { FEEDBACK } from "@/config/colors";
import { THEME } from "@/config/theme";
import { fitScreen } from "@/utils/responsive";
import { fitText } from "@/utils/layout";
import { setInteractive } from "@/utils/interactive";
import { AnimationManager } from "@/libs/animation";

// Results shown on a real notepad on the wood desk (matching the theme).
export class CompleteScene extends Scene {
  private responsive?: ResponsiveHandler;
  private anim!: AnimationManager;
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Container;
  private pad!: Phaser.GameObjects.Image;
  private rings!: Phaser.GameObjects.Image;
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
    this.anim = new AnimationManager(this);

    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.3).setDepth(ZOrder.OVERLAY - 1).setAlpha(0);
    this.panel = this.add.container(0, 0).setDepth(ZOrder.OVERLAY);

    this.pad = this.add.image(0, 0, THEME.pad("white")).setOrigin(0.5);
    this.rings = this.add.image(0, 0, THEME.rings).setOrigin(0.5);
    this.panel.add([this.pad, this.rings]);

    this.header = this.add
      .text(0, 0, LANG.COMPLETE_HEADER, { fontFamily: FONT_FAMILY.BOLD, color: "#2a2a2a" })
      .setOrigin(0.5)
      .setRTL(isRTL());
    const total = getGameData().questions.length;
    // Quiz mode shows "score / total"; reveal mode shows a "done" message.
    // scorePair() orders the operands correctly for the active direction.
    const scoreLabel =
      getMode(getGameData()) === "quiz"
        ? scorePair(State.score, total)
        : LANG.COMPLETE_DONE;
    this.scoreText = this.add
      .text(0, 0, scoreLabel, { fontFamily: FONT_FAMILY.BOLD, color: "#1c7a45", align: "center" })
      .setOrigin(0.5)
      .setRTL(isRTL());
    this.panel.add([this.header, this.scoreText]);

    this.button = this.add.container(0, 0);
    this.buttonBg = this.add.graphics();
    this.buttonText = this.add
      .text(0, 0, LANG.COMPLETE_RESTART, { fontFamily: FONT_FAMILY.BOLD, color: "#ffffff" })
      .setOrigin(0.5)
      .setRTL(isRTL());
    this.button.add([this.buttonBg, this.buttonText]);
    this.panel.add(this.button);
    setInteractive(this.button, this.input);
    this.button.on(Phaser.Input.Events.POINTER_OVER, () => this.button.setScale(1.05));
    this.button.on(Phaser.Input.Events.POINTER_OUT, () => this.button.setScale(1));
    this.button.on(Phaser.Input.Events.POINTER_DOWN, () =>
      this.anim.playButtonPress(this.button).then(() => this.restart())
    );

    this.handleResponsive();

    // Win / lose orchestration.
    const isQuiz = getMode(getGameData()) === "quiz";
    const win = isQuiz ? State.score / Math.max(1, total) >= 0.5 : true;
    const [w, h] = fitScreen(this.scale);
    const center = { x: w / 2, y: h / 2 };

    // 1) Dim the background in (no instant appear).
    this.tweens.add({ targets: this.overlay, alpha: 0.45, duration: 320, ease: "Sine.easeOut" });

    // 2) Hide the pieces that will animate in after the popup lands.
    this.button.setScale(0).setAlpha(0);
    if (isQuiz) this.scoreText.setText(scorePair(0, total));

    // 3) Popup entrance, then the celebration / commiseration sequence.
    this.anim.showPopup(this.panel, { sfx: "sfx-open" }).then(() => {
      if (win) this.anim.playWin({ center });
      else this.anim.playLose();

      if (isQuiz) {
        this.time.delayedCall(200, () =>
          this.anim.countUp(this.scoreText, State.score, {
            format: (n) => scorePair(n, total),
          })
        );
      } else {
        this.time.delayedCall(200, () => this.anim.playTextBounce(this.scoreText));
      }

      // 4) Button appears sequentially after the score settles.
      this.time.delayedCall(700, () => this.anim.sequentialAppear([this.button]));
    });
  }

  private restart() {
    ["UI"].forEach((k) => this.scene.stop(k));
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

    // Notepad sized to the screen (portrait pad aspect ~0.86).
    const ratio = this.pad.height / this.pad.width;
    let padH = Math.min(height * 0.8, 620);
    let padW = padH / ratio;
    if (padW > width * 0.86) {
      padW = width * 0.86;
      padH = padW * ratio;
    }
    this.pad.setDisplaySize(padW, padH);
    this.rings.setDisplaySize(padW, padH);

    // Paper area runs below the spiral binding.
    this.header.setPosition(0, -padH * 0.24);
    fitText(this.header, padW * 0.7, padH * 0.16, { max: Math.round(padH * 0.15) });

    this.scoreText.setPosition(0, padH * 0.02);
    fitText(this.scoreText, padW * 0.6, padH * 0.24, { max: Math.round(padH * 0.22) });

    const bw = padW * 0.62;
    const bh = padH * 0.15;
    this.buttonBg.clear();
    this.buttonBg.fillStyle(0x000000, 0.2).fillRoundedRect(-bw / 2 + 3, -bh / 2 + 4, bw, bh, bh / 2);
    this.buttonBg.fillStyle(FEEDBACK.correct, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    this.button.setSize(bw, bh).setPosition(0, padH * 0.3);
    fitText(this.buttonText, bw * 0.85, bh * 0.6, { max: Math.round(bh * 0.5) });
  }

  private onShutdown() {
    this.responsive?.destroy();
    this.responsive = undefined;
  }
}
