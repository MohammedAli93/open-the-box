import { Scene } from "phaser";
import type RexUI from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import type Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import { ResponsiveHandler } from "@/libs/responsive";
import { LANG } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { AudioManager } from "@/libs/audio";
import { fitScreen } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";

const GAMEPLAY = ["Grid", "Complete"];

// Ported from the previous game: the bottom-left menu window (Submit / Restart /
// Resume), adapted to the new scenes.
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
    AudioManager.playSFX(this.sound, "sfx-open");

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
        .text(0, 0, LANG.MENU_HEADER, { fontFamily: FONT_FAMILY.REGULAR })
        .setRTL(true)
        .setFontSize(20)
        .setAlpha(0.75),
      { align: "center" }
    );
    window.add(this.rexUI.add.roundRectangle(0, 0, 1, 1, 1, 0x000000, 0.5), { expand: true });

    const createButton = (text: string, callback: () => void) => {
      const bg = this.rexUI.add.roundRectangle(0, 0, 0, 0, 5, 0xffffff, 0.25).setVisible(false);
      const button = this.rexUI.add.label({
        background: bg,
        text: this.add
          .text(0, 0, text, { fontFamily: FONT_FAMILY.BOLD })
          .setRTL(true)
          .setFontSize(28)
          .setAlpha(0.75),
        align: "center",
        space: { left: 5, right: 5, top: 5, bottom: 5 },
      });
      button
        .on(Phaser.Input.Events.POINTER_OVER, () => bg.setVisible(true))
        .on(Phaser.Input.Events.POINTER_OUT, () => bg.setVisible(false))
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

    this.handleResponsive();
  }

  onShutdown() {
    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
  }

  onSubmit() {
    this.scene.setVisible(true, "UI");
    this.scene.stop();
    this.scene.launch("Complete"); // Grid stays paused underneath
  }

  onRestart() {
    ["Complete", "UI"].forEach((k) => this.scene.stop(k));
    this.scene.stop();
    this.scene.start("Grid");
  }

  onContinue() {
    this.scene.stop();
    GAMEPLAY.forEach((k) => this.scene.isPaused(k) && this.scene.resume(k));
    this.scene.setVisible(true, "UI");
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const background = this.children.getByName("background") as Phaser.GameObjects.Rectangle;
    const window = this.children.getByName("window") as Sizer;

    const place = (offset: number) => {
      const [width, height] = fitScreen(this.scale);
      background.setSize(width, height).setPosition(width / 2, height / 2);
      window.setPosition(offset, height - offset).layout();
    };

    this.responsiveHandler.events.on("resize", () => place(10));
    this.responsiveHandler.events.on("mobile", () => place(5));
    this.responsiveHandler.trigger();
  }
}
