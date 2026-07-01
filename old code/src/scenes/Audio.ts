import { Scene } from "phaser";
import type RexUI from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import { ResponsiveHandler } from "@/libs/responsive";
import { LANG } from "@/config/lang";
import type Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import { State } from "@/core/state";
import { updateConfig } from "@/utils/config";
import { type GameScene } from "@/scenes/Game";
import { fitScreen } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";

export class AudioScene extends Scene {
  declare rexUI: RexUI;
  responsiveHandler?: ResponsiveHandler;

  constructor() {
    super("Audio");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    const background = this.add
      .rectangle(0, 0, 1, 1, 0x000000, 0.75)
      .setName("background")
      .on(Phaser.Input.Events.POINTER_DOWN, this.onClose, this);
    setInteractive(background, this.input, false);

    const window = this.rexUI.add
      .sizer({
        orientation: "vertical",
        originX: 1,
        originY: 1,
        space: { item: 10, top: 10, bottom: 10, left: 20, right: 20 },
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

    const createButton = (
      text: string,
      callback: (button: Sizer) => void,
      enable: boolean
    ) => {
      const background = this.rexUI.add
        .roundRectangle(0, 0, 0, 0, 5, 0xffffff, 0.25)
        .setVisible(false);
      const button = this.rexUI.add.sizer({
        space: { item: 5, left: 10, right: 10, top: 5, bottom: 5 },
      });
      button.addBackground(background);
      button.add(
        this.add
          .text(0, 0, text)
          .setFontFamily("reddit-sands-semibold")
          .setFontStyle("bold")
          .setFontSize(28)
          .setAlpha(0.75)
      );
      button.addSpace();
      button.add(
        this.add
          .image(0, 0, enable ? "audio-icon" : "audio-icon-muted")
          .setOrigin(0.5)
          .setAlpha(enable ? 0.75 : 0.25),
        { key: "icon" }
      );
      button
        .on(Phaser.Input.Events.POINTER_OVER, () => background.setVisible(true))
        .on(Phaser.Input.Events.POINTER_OUT, () => background.setVisible(false))
        .on(Phaser.Input.Events.POINTER_DOWN, () => callback(button));
      setInteractive(button, this.input);
      return button;
    };

    const buttons = this.rexUI.add.buttons({
      orientation: "vertical",
      space: { item: 10 },
      buttons: [
        createButton(LANG.AUDIO_BGM, (button) => this.onBGM(button), State.bgm),
        createButton(LANG.AUDIO_SFX, (button) => this.onSFX(button), State.sfx),
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

  onClose() {
    this.scene.stop();
    const gameScene = this.scene.get("Game") as GameScene;
    if (gameScene && gameScene.gameStarted) {
      this.scene.resume("Game");
    }
    this.scene.setVisible(true, "UI");
  }

  onBGM(button: Sizer) {
    State.bgm = !State.bgm;
    updateConfig({ bgm: State.bgm });
    const icon = button.getElement("icon") as Phaser.GameObjects.Image;
    if (State.bgm) {
      icon.setTexture("audio-icon").setAlpha(0.75);
    } else {
      icon.setTexture("audio-icon-muted").setAlpha(0.25);
    }
    this.game.events.emit("audio-bgm", State.bgm);
  }

  onSFX(button: Sizer) {
    State.sfx = !State.sfx;
    updateConfig({ sfx: State.sfx });
    const icon = button.getElement("icon") as Phaser.GameObjects.Image;
    if (State.sfx) {
      icon.setTexture("audio-icon").setAlpha(0.75);
    } else {
      icon.setTexture("audio-icon-muted").setAlpha(0.25);
    }
    this.game.events.emit("audio-sfx", State.sfx);
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

      window.setPosition(width - 10, height - 10).layout();
    });

    this.responsiveHandler.trigger();
  }
}
