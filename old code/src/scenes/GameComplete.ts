import { Scene } from "phaser";
import type RexUI from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import { ResponsiveHandler } from "@/libs/responsive";
import { LANG } from "@/config/lang";
import type Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import { AudioManager } from "@/libs/audio";
import { fitScreen } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";

export interface GameCompleteData {
  /** Score [correct, total] */
  score: [number, number];
  /** Time in milliseconds */
  time: number;
}

export class GameCompleteScene extends Scene {
  declare rexUI: RexUI;
  responsiveHandler?: ResponsiveHandler;

  constructor() {
    super("GameComplete");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
  }

  create(data: GameCompleteData) {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    this.add.rectangle(0, 0, 1, 1, 0x000000, 0.75).setName("background");
    const window = this.rexUI.add
      .sizer({
        orientation: "vertical",
        space: { item: 10, top: 30, bottom: 30, left: 20, right: 20 },
      })
      .addBackground(
        this.rexUI.add.roundRectangle({
          strokeColor: 0xffffff,
          strokeWidth: 2,
          radius: 10,
          color: 0x000000,
          alpha: 0.75,
        })
      )
      .setName("window");
    window.add(
      this.add
        .text(0, 0, LANG.GAME_COMPLETE_HEADER)
        .setFontFamily("reddit-sands-regular")
        .setFontSize(28)
        .setAlpha(0.75)
    );
    window.add(this.rexUI.add.roundRectangle(0, 0, 1, 1, 1, 0x000000, 0.5), {
      expand: true,
    });
    const score = this.rexUI.add
      .sizer({ orientation: "vertical" })
      .add(
        this.add
          .text(0, 0, LANG.GAME_COMPLETE_SCORE)
          .setFontFamily("reddit-sands-regular")
          .setFontSize(32)
          .setColor("#00FFFF")
      );
    const scoreText = this.rexUI.add
      .sizer({ orientation: "horizontal" })
      .add(
        this.add
          .text(0, 0, String(data.score[0]))
          .setFontFamily("reddit-sands-semibold")
          .setFontSize(48),
        { align: "bottom" }
      )
      .add(
        this.add
          .text(0, 0, `/${data.score[1]}`)
          .setFontFamily("reddit-sands-semibold")
          .setFontSize(24),
        { align: "bottom", offsetY: -6 }
      );
    score.add(scoreText);
    const time = this.rexUI.add
      .sizer({ orientation: "vertical" })
      .add(
        this.add
          .text(0, 0, LANG.GAME_COMPLETE_TIME)
          .setFontFamily("reddit-sands-regular")
          .setFontSize(32)
          .setColor("#00FFFF")
      );
    const seconds = Math.floor(data.time / 1000);
    const decimals = String((data.time / 1000) % 1).split(".")[1].slice(0, 2);
    const timeText = this.rexUI.add
      .sizer({ orientation: "horizontal" })
      .add(
        this.add
          .text(0, 0, `${String(seconds)}.`)
          .setFontFamily("reddit-sands-semibold")
          .setFontSize(48),
        { align: "bottom" }
      )
      .add(
        this.add
          .text(0, 0, `${decimals}s`)
          .setFontFamily("reddit-sands-semibold")
          .setFontSize(24),
        { align: "bottom", offsetY: -6 }
      );
    time.add(timeText);
    window.add(
      this.rexUI.add
        .sizer({ space: { item: 10 } })
        .add(score)
        .add(time)
    );
    window.add(this.rexUI.add.roundRectangle(0, 0, 1, 1, 1, 0x000000, 0.5), {
      expand: true,
    });
    const createButton = (text: string, callback: () => void) => {
      const background = this.rexUI.add
        .roundRectangle(0, 0, 0, 0, 5, 0xffffff, 0.25)
        .setVisible(false);
      const button = this.rexUI.add.label({
        background,
        text: this.add
          .text(0, 0, text)
          .setFontFamily("reddit-sands-regular")
          .setFontSize(28)
          .setAlpha(0.75),
        space: {
          left: 5,
          right: 5,
          top: 5,
          bottom: 5,
        },
      });
      button
        .on(Phaser.Input.Events.POINTER_OVER, () => background.setVisible(true))
        .on(Phaser.Input.Events.POINTER_OUT, () => background.setVisible(false))
        .on(Phaser.Input.Events.POINTER_DOWN, () => callback());
      setInteractive(button, this.input);
      return button;
    };
    const buttons = this.rexUI.add.buttons({
      orientation: "vertical",
      space: { item: 10 },
      buttons: [
        // createButton(LANG.GAME_COMPLETE_BUTTON_LEADERBOARD, () => this.onLeaderboard()),
        createButton(LANG.GAME_COMPLETE_BUTTON_SHOW_ANSWERS, () =>
          this.onShowAnswers()
        ),
        createButton(LANG.GAME_COMPLETE_BUTTON_START_OVER, () =>
          this.onStartOver()
        ),
      ],
    });
    window.add(buttons);

    this.handleResponsive();
  }

  onShutdown() {
    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
  }

  onLeaderboard() {}

  onShowAnswers() {
    this.scene.stop();
    this.scene.launch("History");
  }

  onStartOver() {
    this.scene.stop();
    AudioManager.playSFX(this.sound, "audio-game-restart");
    this.scene.get("Game").scene.restart();
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const background = this.children.getByName(
      "background"
    ) as Phaser.GameObjects.Rectangle;
    const window = this.children.getByName("window") as Sizer;

    this.responsiveHandler.events.on("resize", () => {
      const [width, height] = fitScreen(this.scale);

      background.setSize(width, height);
      background.setPosition(width / 2, height / 2);

      window.setPosition(width / 2, height / 2).layout();
    });

    this.responsiveHandler.trigger();
  }
}
