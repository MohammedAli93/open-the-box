import { Scene } from "phaser";
import type RexUI from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import { ResponsiveHandler } from "@/libs/responsive";
import { LANG } from "@/config/lang";
import type Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import { type GameScene } from "@/scenes/Game";
import { AudioManager } from "@/libs/audio";
import { fitScreen } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";

export class MenuScene extends Scene {
  declare rexUI: RexUI;
  responsiveHandler?: ResponsiveHandler;

  constructor() {
    super("Menu");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    AudioManager.playSFX(this.sound, "audio-game-menu");

    const background = this.add
      .rectangle(0, 0, 1, 1, 0x000000, 0.75)
      .setName("background")
      .on(Phaser.Input.Events.POINTER_DOWN, this.onContinue, this);
    setInteractive(background, this.input, false);

    const window = this.rexUI.add
      .sizer({
        orientation: "vertical",
        originX: 0,
        originY: 1,
        space: { item: 10, top: 20, bottom: 10, left: 20, right: 20 },
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
        .text(0, 0, LANG.MENU_HEADER)
        .setFontFamily("reddit-sands-regular")
        .setFontSize(20)
        .setAlpha(0.75),
      { align: "center" }
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
          .setFontFamily("reddit-sands-semibold")
          .setFontStyle("bold")
          .setFontSize(28)
          // .setAlign("center")
          .setAlpha(0.75),
        align: "center",
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
        createButton(LANG.MENU_SUBMIT, () => this.onSubmit()),
        createButton(LANG.MENU_RESTART, () => this.onRestart()),
        createButton(LANG.MENU_RESUME, () => this.onContinue()),
      ],
    });
    window.add(buttons);

    const message = this.add
      .text(0, 0, LANG.MENU_MESSAGE)
      .setFontFamily("reddit-sands-semibold")
      .setOrigin(0.5)
      .setAlign("center")
      .setShadow(3, 3, "#000000")
      .setName("message");
    const gameScene = this.scene.get("Game") as GameScene;
    if (gameScene && gameScene.gameStarted) {
      this.scene.resume("Game");
      message.setVisible(false);
    }

    this.handleResponsive();
  }

  onShutdown() {
    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
  }

  onSubmit() {
    this.scene.stop();
    this.scene.resume("Game");
    this.scene.setVisible(true, "UI");
    const scene = this.scene.get("Game") as GameScene;
    scene.onGameComplete();
  }

  onRestart() {
    this.scene.stop();
    this.scene.stop("History");
    this.scene.get("Game").scene.restart();
  }

  onContinue() {
    this.scene.stop();
    const gameScene = this.scene.get("Game") as GameScene;
    if (gameScene && gameScene.gameStarted) {
      this.scene.resume("Game");
    }
    this.scene.resume("History");
    this.scene.resume("GameComplete");
    this.scene.setVisible(true, "UI");
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const background = this.children.getByName(
      "background"
    ) as Phaser.GameObjects.Rectangle;
    const window = this.children.getByName("window") as Sizer;
    const message = this.children.getByName(
      "message"
    ) as Phaser.GameObjects.Text;

    this.responsiveHandler.events.on("resize", () => {
      const [width, height] = fitScreen(this.scale);

      background.setSize(width, height);
      background.setPosition(width / 2, height / 2);

      window.setPosition(10, height - 10).layout();

      message.setFontSize(64);
      message.setPosition(width / 2, height / 2);
      message.setWordWrapWidth(width * 0.8);
    });

    this.responsiveHandler.events.on("mobile", () => {
      const [width, height] = fitScreen(this.scale);

      background.setSize(width, height);
      background.setPosition(width / 2, height / 2);

      window.setPosition(5, height - 5).layout();

      message.setFontSize(24);
      message.setPosition(width / 2, height / 3);
      message.setWordWrapWidth(width * 0.8);
    });

    this.responsiveHandler.trigger();
  }
}
