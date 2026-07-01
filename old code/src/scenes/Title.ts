import { Scene } from "phaser";
import type RexUI from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import { ResponsiveHandler } from "@/libs/responsive";
import { StartButton } from "@/gameobjects/start-button";
import { LANG } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { ZOrder } from "@/config/zorder";
import { AudioManager } from "@/libs/audio";
import { fitScreen } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";

export class TitleScene extends Scene {
  declare rexUI: RexUI;
  private responsiveHandler?: ResponsiveHandler;

  constructor() {
    super("Title");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
  }

  create() {
    // Events
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    // Background
    this.add.rectangle(0, 0, 1, 1, 0x000000, 0.9).setName("background");

    // Header
    this.add
      .text(0, 0, LANG.TITLE_HEADER)
      .setFontFamily(FONT_FAMILY.TITLE_HEADER)
      .setOrigin(0.5)
      .setName("header");

    // Title
    this.add
      .text(0, 0, LANG.TITLE_GAME)
      .setFontFamily(FONT_FAMILY.TITLE_GAME)
      .setOrigin(0.5)
      .setName("title");

    // Start Button
    // this.add
    //   .existing(new StartButton(this, { callback: () => this.onStartButton() }))
    //   .setName("start-button");
    // this.createPlayButton().setName('play-button').setDepth(ZOrder.TITLE_TEXT);
    this.createPlayButton().setName('play-button').setDepth(ZOrder.TITLE_TEXT);

    // Footer
    this.add
      .text(0, 0, LANG.TITLE_FOOTER)
      .setFontFamily(FONT_FAMILY.TITLE_FOOTER)
      .setOrigin(0.5)
      .setAlign("center")
      .setName("footer");

    this.handleResponsive();
    this.startAnimation();
  }

  async startAnimation() {
    const header = this.children.getByName("header") as Phaser.GameObjects.Text;
    const title = this.children.getByName("title") as Phaser.GameObjects.Text;
    const footer = this.children.getByName("footer") as Phaser.GameObjects.Text;
    const startButton = this.children.getByName('play-button') as Phaser.GameObjects.Container;

    header.setAlpha(0);
    title.setAlpha(0);
    footer.setAlpha(0);
    startButton.setAlpha(0);
    await this.createSlideIn(header);
    await this.createSlideIn(title);
    await this.createSlideIn(footer);
    const startButtonScale = startButton.scale;
    startButton.setScale(0);
    startButton.setAlpha(1);
    this.tweens.add({
      targets: startButton,
      scale: startButtonScale,
      duration: 500,
      ease: "Back.easeOut",
    });
  }

  createSlideIn(text: Phaser.GameObjects.Text) {
    return new Promise((resolve) => {
      const textY = text.y;
      text.setY(textY - text.displayHeight / 2);
      this.tweens.add({
        targets: text,
        y: textY,
        alpha: 1,
        duration: 500,
        ease: "Back.easeOut",
        onComplete: resolve,
      });
    });
  }

  createPlayButton() {
    const button = this.add.image(0, 0, "title-play-icon");
    setInteractive(button, this.input);
    button.on(Phaser.Input.Events.POINTER_OVER, () => {
      // button.setTexture("title-play-click");
      const scale = button.getData("scale");
      this.tweens.add({
        targets: button,
        duration: 250,
        scale: scale * 1.1,
      });
    });
    button.on(Phaser.Input.Events.POINTER_OUT, () => {
      // button.setTexture("title-play-idle");
      const scale = button.getData("scale");
      this.tweens.add({
        targets: button,
        duration: 250,
        scale: scale,
      });
    });
    button.on(Phaser.Input.Events.POINTER_UP, () => {
      this.onStartButton();
    });
    return button;
  }

//   createPlayButton() {
//     const button = this.rexUI.add.overlapSizer().setDepth(ZOrder.TITLE_TEXT);

//     const background = this.rexUI.add.roundRectangle({
//         color: 0x1081C7,
//         radius: 10,
//         strokeColor: 0xFFFFFF
//     });

//     button.addBackground(background);

//     const icon = this.add.image(0, 0, 'title-play').setDepth(ZOrder.TITLE_TEXT);
//     button.add(icon, { align: 'center' });

//     const text = this.add.text(0, 0, LANG.TITLE_PLAY_BUTTON)
//         .setFontFamily(FONT_FAMILY.TITLE_START_BUTTON)
//         .setOrigin(0.5, 0.5)
//         .setFontStyle('bold')
//         .setFontSize(35)
//         .setDepth(ZOrder.TITLE_TEXT)
//         // .setScale(1.0, 0.0)
//         .setVisible(false)
//         .setPadding(0, 10);
//     button.add(text, { align: 'center' });

//     background.setInteractive({ useHandCursor: true });

//     background.on(Phaser.Input.Events.POINTER_OVER, () => {
//       text.setVisible(true);
//         this.tweens.killTweensOf(background);
//         this.tweens.add({
//             targets: background,
//             duration: 100,
//             alpha: 1.0
//         });
//         this.tweens.add({
//             targets: text,
//             duration: 100,
//             scaleY: 1.0,
//             alpha: 1.0
//         });
//         this.tweens.add({
//             targets: icon,
//             duration: 100,
//             scaleY: 0.0,
//             alpha: 0.0
//         });
//     });

//     background.on(Phaser.Input.Events.POINTER_OUT, () => {
//         this.tweens.killTweensOf(background);
//         this.tweens.add({
//             targets: background,
//             duration: 100,
//             alpha: 0.9
//         });
//         this.tweens.add({
//             targets: text,
//             duration: 100,
//             scaleY: 0.0,
//             alpha: 0.0
//         });
//         this.tweens.add({
//             targets: icon,
//             duration: 100,
//             scaleY: 1.0,
//             alpha: 1.0
//         });
//     });

//     background.on(Phaser.Input.Events.POINTER_UP, () => {
//       this.onStartButton();
//     });

//     this.add.existing(button);
//     button.layout();

//     return button;
// }

  onShutdown() {
    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
  }

  onStartButton() {
    this.scene.stop();
    this.scene.resume("Game");
    AudioManager.playSFX(this.sound, "audio-game-intro");
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const background = this.children.getByName(
      "background"
    ) as Phaser.GameObjects.Rectangle;
    const header = this.children.getByName("header") as Phaser.GameObjects.Text;
    const title = this.children.getByName("title") as Phaser.GameObjects.Text;
    // const startButton = this.children.getByName("start-button") as StartButton;
    const footer = this.children.getByName("footer") as Phaser.GameObjects.Text;
    const startButton = this.children.getByName('play-button') as Phaser.GameObjects.Container;

    this.responsiveHandler.events.on("resize", () => {
      const [width, height] = fitScreen(this.scale);

      // Sizes
      background.setSize(width, height);
      header.setFontSize(34);
      title.setFontSize(86);
      startButton.setScale(1).setData("scale", startButton.scale);
      footer.setFontSize(34);
      footer.setWordWrapWidth(width * 0.8);

      // Positions
      const margin = height * 0.025;
      const totalHeight =
        header.displayHeight +
        title.displayHeight +
        startButton.displayHeight +
        footer.displayHeight +
        margin * 4;

      background.setPosition(width / 2, height / 2);

      header.setPosition(
        width / 2,
        height / 2 - totalHeight / 2 - header.displayHeight / 2
      );

      title.setPosition(
        width / 2,
        header.y + header.displayHeight / 2 + title.displayHeight / 2 + margin
      );

      startButton.setPosition(
        width / 2,
        title.y + title.height / 2 + startButton.getBounds().height / 2 + margin
      );
      // startButton.layout();

      footer.setPosition(
        width / 2,
        startButton.y +
          startButton.displayHeight / 2 +
          footer.displayHeight / 2 +
          margin
      );
    });

    this.responsiveHandler.events.on("mobile", () => {
      const [width, height] = fitScreen(this.scale);
      const isIpad = width > 900 && height > 900;

      // Sizes
      background.setSize(width, height);
      if (!isIpad) {
        header.setFontSize(26);
        title.setFontSize(48);
        startButton.setScale(0.75).setData("scale", startButton.scale);
        footer.setFontSize(26);
        footer.setWordWrapWidth(width * 0.8);
      }

      // Positions
      const margin = height * 0.025;
      const totalHeight =
        header.displayHeight +
        title.displayHeight +
        startButton.displayHeight +
        footer.displayHeight +
        margin * 4;

      background.setPosition(width / 2, height / 2);

      header.setPosition(
        width / 2,
        height / 2 - totalHeight / 2 - header.displayHeight / 2
      );

      title.setPosition(
        width / 2,
        header.y + header.displayHeight / 2 + title.displayHeight / 2 + margin
      );

      startButton.setPosition(
        width / 2,
        title.y + title.height / 2 + startButton.getBounds().height / 2 + margin
      );
      // startButton.layout();

      footer.setPosition(
        width / 2,
        startButton.y +
          startButton.displayHeight / 2 +
          footer.displayHeight / 2 +
          margin
      );
    });

    this.responsiveHandler.trigger();
  }
}
