import { ResponsiveHandler } from "@/libs/responsive";
import { setInteractive } from "@/utils/interactive";
import { DPR, fitScreen } from "@/utils/responsive";

export class UIScene extends Phaser.Scene {
  responsiveHandler?: ResponsiveHandler;

  constructor() {
    super("UI");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.scale.on(
      Phaser.Scale.Events.ENTER_FULLSCREEN,
      this.handleFullscreen,
      this
    );
    this.scale.on(
      Phaser.Scale.Events.LEAVE_FULLSCREEN,
      this.handleFullscreen,
      this
    );

    const menu = this.add.image(0, 0, "ui-menu").setName("menu").setAlpha(0.75);
    setInteractive(menu, this.input);
    menu.on(Phaser.Input.Events.POINTER_OVER, () => menu.setAlpha(1.0));
    menu.on(Phaser.Input.Events.POINTER_OUT, () => menu.setAlpha(0.75));
    menu.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.setVisible(false);
      this.scene.pause("Game");
      this.scene.pause("GameComplete");
      this.scene.pause("History");
      this.scene.launch("Menu");
    });

    const fullscreen = this.add
      .image(0, 0, "ui-fullscreen")
      .setName("fullscreen")
      .setAlpha(0.75);
    setInteractive(fullscreen, this.input);
    fullscreen.on(Phaser.Input.Events.POINTER_OVER, () =>
      fullscreen.setAlpha(1.0)
    );
    fullscreen.on(Phaser.Input.Events.POINTER_OUT, () =>
      fullscreen.setAlpha(0.75)
    );
    fullscreen.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (fullscreen.texture.key === "ui-fullscreen") {
        this.scale.startFullscreen();
      } else {
        this.scale.stopFullscreen();
      }
    });

    const audio = this.add.image(0, 0, "ui-audio").setName("audio").setAlpha(0.75);
    setInteractive(audio, this.input);
    audio.on(Phaser.Input.Events.POINTER_OVER, () => audio.setAlpha(1.0));
    audio.on(Phaser.Input.Events.POINTER_OUT, () => audio.setAlpha(0.75));
    audio.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.setVisible(false);
      this.scene.pause("Game");
      this.scene.launch("Audio");
    });

    this.handleResponsive();
  }

  onShutdown() {
    this.scale.off(
      Phaser.Scale.Events.ENTER_FULLSCREEN,
      this.handleFullscreen,
      this
    );
    this.scale.off(
      Phaser.Scale.Events.LEAVE_FULLSCREEN,
      this.handleFullscreen,
      this
    );
    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
  }

  handleFullscreen() {
    const fullscreen = this.children.getByName(
      "fullscreen"
    ) as Phaser.GameObjects.Image;
    if (!fullscreen) return;

    const textureKey = this.scale.isFullscreen
      ? "ui-fullscreen-exit"
      : "ui-fullscreen";
    fullscreen.setTexture(textureKey);
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const menu = this.children.getByName("menu") as Phaser.GameObjects.Image;
    const fullscreen = this.children.getByName(
      "fullscreen"
    ) as Phaser.GameObjects.Image;
    const audio = this.children.getByName("audio") as Phaser.GameObjects.Image;

    this.responsiveHandler.events.on("resize", () => {
      const [width, height] = fitScreen(this.scale);

      const offset = 10;

      if (menu) {
        menu.setScale(1.0);
        menu.setPosition(
          offset + menu.displayWidth / 2,
          height - (offset + menu.displayHeight / 2)
        );
      }

      if (fullscreen) {
        fullscreen.setScale(1.0);
        fullscreen.setPosition(
          width - offset - fullscreen.displayWidth / 2,
          height - (offset + fullscreen.displayHeight / 2)
        );
      }

      if (audio) {
        audio.setScale(1.0);
        audio.setPosition(
          fullscreen.x - offset - audio.displayWidth,
          height - (offset + audio.displayHeight / 2)
        );
      }
    });

    this.responsiveHandler.events.on("mobile", () => {
      const [width, height] = fitScreen(this.scale);
      const isIpad = width > 900 && height > 900;

      const offset = 2;

      if (menu) {
        if (!isIpad) menu.setScale(0.5 * DPR);
        menu.setPosition(
          offset + menu.displayWidth / 2,
          height - (offset + menu.displayHeight / 2)
        );
      }

      if (fullscreen) {
        if (!isIpad) fullscreen.setScale(0.5 * DPR);
        fullscreen.setPosition(
          width - offset - fullscreen.displayWidth / 2,
          height - (offset + fullscreen.displayHeight / 2)
        );
      }

      if (audio) {
        if (!isIpad) audio.setScale(0.5 * DPR);
        audio.setPosition(
          fullscreen.x - offset - audio.displayWidth,
          height - (offset + audio.displayHeight / 2)
        );
      }
    });

    this.responsiveHandler.trigger();
  }
}
