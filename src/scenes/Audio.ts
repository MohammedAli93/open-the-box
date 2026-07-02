import { Scene } from "phaser";
import type RexUI from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import type Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import { ResponsiveHandler } from "@/libs/responsive";
import { LANG } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { State } from "@/core/state";
import { updateConfig } from "@/utils/config";
import { fitScreen } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";

const GAMEPLAY = ["Grid", "Question", "Reveal", "Complete"];

// Ported from the previous game: the bottom-right audio window with BGM/SFX
// toggles, adapted to the new AudioManager.
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

    const createButton = (text: string, callback: (button: Sizer) => void, enable: boolean) => {
      const bg = this.rexUI.add.roundRectangle(0, 0, 0, 0, 5, 0xffffff, 0.25).setVisible(false);
      const button = this.rexUI.add.sizer({ space: { item: 5, left: 10, right: 10, top: 5, bottom: 5 } });
      button.addBackground(bg);
      button.add(
        this.add
          .text(0, 0, text, { fontFamily: FONT_FAMILY.BOLD })
          .setRTL(true)
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
        .on(Phaser.Input.Events.POINTER_OVER, () => bg.setVisible(true))
        .on(Phaser.Input.Events.POINTER_OUT, () => bg.setVisible(false))
        .on(Phaser.Input.Events.POINTER_DOWN, () => callback(button));
      setInteractive(button, this.input);
      return button;
    };

    // Only sound effects — no background music.
    const buttons = this.rexUI.add.buttons({
      orientation: "vertical",
      space: { item: 10 },
      buttons: [createButton(LANG.AUDIO_SFX, (button) => this.onSFX(button), State.sfx)],
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
    GAMEPLAY.forEach((k) => this.scene.isPaused(k) && this.scene.resume(k));
    this.scene.setVisible(true, "UI");
  }

  private setIcon(button: Sizer, on: boolean) {
    const icon = button.getElement("icon") as Phaser.GameObjects.Image;
    icon.setTexture(on ? "audio-icon" : "audio-icon-muted").setAlpha(on ? 0.75 : 0.25);
  }

  onSFX(button: Sizer) {
    State.sfx = !State.sfx;
    updateConfig({ sfx: State.sfx });
    this.setIcon(button, State.sfx);
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const background = this.children.getByName("background") as Phaser.GameObjects.Rectangle;
    const window = this.children.getByName("window") as Sizer;

    this.responsiveHandler.events.on("resize", () => {
      const [width, height] = fitScreen(this.scale);
      background.setSize(width, height).setPosition(width / 2, height / 2);
      window.setPosition(width - 10, height - 10).layout();
    });
    this.responsiveHandler.trigger();
  }
}
