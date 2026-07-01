import { COLORS } from "@/config/colors";
import { ZOrder } from "@/config/zorder";
import { type Answer } from "@/data";
import { type PhaserScene } from "@/main";
import { resizeImageBy } from "@/utils/image";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";

interface IAnswerContainerConfig {
  x?: number;
  y?: number;
  sizerConfig?: Sizer.IConfig;
  status?: "none" | "correct" | "incorrect";
  color?: number;
}

function fitInContainer(
  container: { displayWidth: number; displayHeight: number },
  image: Phaser.GameObjects.Image
) {
  const scaleWidth = container.displayWidth / image.frame.realWidth;
  const scaleHeight = container.displayHeight / image.frame.realHeight;
  const scale = Math.min(scaleWidth, scaleHeight);
  image.setScale(scale);
}

export class AnswerContainer extends Sizer {
  constructor(scene: PhaserScene, config?: IAnswerContainerConfig) {
    const {
      x = 0,
      y = 0,
      sizerConfig,
      status = "none",
      color = Phaser.Utils.Array.GetRandom(COLORS),
    } = config || {};

    super(scene, x, y, {
      orientation: "horizontal",
      space: {
        top: 5,
        right: 15,
        bottom: 5,
        left: 15,
        item: 10,
      },
      ...sizerConfig,
    });

    this.setDepth(ZOrder.GAME_QUESTION_CONTAINER);

    // Background
    const background = scene.rexUI.add.roundRectangle({
      color,
      radius: 10,
    });
    this.addBackground(background);

    // Key
    this.add(scene.add.text(0, 0, "").setOrigin(0.5), {
      key: "key",
      proportion: 10,
    });

    // Image
    this.add(scene.add.image(0, 0, "__NORMAL"), {
      key: "image",
      proportion: 35,
    });

    // Text
    this.add(scene.add.text(0, 0, "").setOrigin(0.5).setAlign("center").setRTL(true).setFontFamily("elmessiri-regular"), {
      key: "text",
      proportion: 40,
      expand: true,
    });

    // Check
    this.add(
      scene.add
        .image(
          0,
          0,
          status !== "none" ? `game-${status}-small` : "game-correct-small"
        )
        .setDisplaySize(15, 15)
        .setVisible(status !== "none"),
      {
        key: "check",
        proportion: 15,
      }
    );

    // background.setInteractive({ useHandCursor: true });

    // background.on(Phaser.Input.Events.POINTER_OVER, () => {
    //   background.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);
    // });

    // background.on(Phaser.Input.Events.POINTER_OUT, () => {
    //   background.postFX.disable(true);
    // });
  }

  rrefresh(width: number, height: number) {
    const key = this.getElement("key") as Phaser.GameObjects.Text;
    const image = this.getElement("image") as Phaser.GameObjects.Image;
    const text = this.getElement("text") as Phaser.GameObjects.Text;
    const check = this.getElement("check") as Phaser.GameObjects.Image;

    text.setScale(1);
    // console.log("size:", width, height);

    this.setMinSize(width * 0.95, height * 0.95);
    this.layout();
    const aspectRatio = this.minWidth / this.minHeight;

    // How we are not using `expand: true` in each of the elements (because it's breaking the layout) we only get one of the dimensions correct.
    // So we need to find the correct size for each of the elements.
    const keySize = Math.max(key.displayWidth, key.displayHeight);
    const imageSize = Math.max(image.displayWidth, image.displayHeight);
    const textSize = Math.max(text.displayWidth, text.displayHeight);
    const checkSize = Math.max(check.displayWidth, check.displayHeight);
    if (aspectRatio > 1.25) {
      // Landscape
      this.setOrientation("horizontal");
      // text.setFontSize(height * 0.125);
      // text.setWordWrapWidth(width * 0.3);
    } else {
      // Portrait
      this.setOrientation("vertical");
      // text.setFontSize(height * 0.1);
      // text.setWordWrapWidth(width * 0.4);
    }
    key.setFontSize(keySize);
    if (image.visible) {
      fitInContainer(
        { displayWidth: imageSize, displayHeight: imageSize },
        image
      );
    }
    // if (text.visible) {
    //   text.setFontSize(textSize * 0.3);
    //   text.setWordWrapWidth(textSize);
    //   console.log(textSize, text.displayWidth);
    //   if (text.displayWidth > textSize) {
    //     text.setScale(textSize / text.displayWidth);
    //   }
    // }

    if (text.visible) {
      // console.log(textSize, text.displayWidth, text.displayHeight)
      const textWidth = text.displayWidth;
      const textHeight = text.displayHeight;

      let fontSize = Math.floor(textHeight * 0.3);
      text.setFontSize(fontSize);

      if (text.displayWidth > textWidth) {
        while (text.displayWidth > textWidth || text.displayHeight > textHeight) {
          fontSize--;
          text.setFontSize(fontSize);
          text.setWordWrapWidth(textWidth);
        }
      } else {
        const newTextWidth = Math.floor(textWidth * 0.9);
        while (text.displayWidth < newTextWidth && text.displayHeight < textHeight) {
          fontSize++;
          text.setFontSize(fontSize);
          text.setWordWrapWidth(newTextWidth);
        }
      }

      // this.bringChildToTop(text);
    }

    check.setDisplaySize(checkSize, checkSize);
    // this.layout();
    // if (image.visible) {
    //   resizeImageBy(image, { size: 120, byWidth: true });
    //   // if (isWide) {
    //   // } else {
    //   //   resizeImageBy(image, { size: 60, byMax: true });
    //   // }
    // }
    // if (text.visible) {
    //   text.setFontSize(18);
    //   text.setWordWrapWidth(100);
    // }
    // check.setDisplaySize(35, 35);
  }

  resetSize() {
    const key = this.getElement("key") as Phaser.GameObjects.Text;
    const image = this.getElement("image") as Phaser.GameObjects.Image;
    const text = this.getElement("text") as Phaser.GameObjects.Text;
    const check = this.getElement("check") as Phaser.GameObjects.Image;

    this.setMinSize(0, 0);
    key.setFontSize(0);
    image.setDisplaySize(0, 0);
    text.setFontSize(0);
    check.setDisplaySize(0, 0);
  }

  refresh(isWide: boolean) {
    const key = this.getElement("key") as Phaser.GameObjects.Text;
    const image = this.getElement("image") as Phaser.GameObjects.Image;
    const text = this.getElement("text") as Phaser.GameObjects.Text;
    const check = this.getElement("check") as Phaser.GameObjects.Image;

    this.setMinWidth(0);
    this.setMinHeight(0);

    key.setFontSize(isWide ? 48 : 24);
    if (text.visible) {
      text.setFontSize(isWide ? 34 : 18);
      text.setWordWrapWidth(isWide ? 200 : 100);
    }
    if (image.visible) {
      if (isWide) {
        resizeImageBy(image, { size: 120, byWidth: true });
      } else {
        resizeImageBy(image, { size: 60, byMax: true });
      }
    }
    check.setDisplaySize(isWide ? 35 : 20, isWide ? 35 : 20);
  }

  setAnswer(answer: Answer) {
    const key = this.getElement("key") as Phaser.GameObjects.Text;
    const image = this.getElement("image") as Phaser.GameObjects.Image;
    const text = this.getElement("text") as Phaser.GameObjects.Text;
    // const check = this.getElement("check") as Phaser.GameObjects.Image;

    key.setText(answer.key);

    text.setVisible(false);
    image.setVisible(false);

    this.remove(text);
    this.remove(image);
    if (answer.text) {
      // add in the 1 index because the image will be added in the same index later, making the text slide to the right.
      this.add(text, { index: 1, key: "text", proportion: 40, expand: true });
      text.setText(answer.text);
      text.setVisible(true);
    }
    if (answer.image) {
      this.add(image, { index: 1, key: "image", proportion: 35 });
      image.setTexture(`game-${answer.image}`).setDisplaySize(40, 40);
      image.setVisible(true);
    }
    // check.setTexture(`game-correct-small`).setDisplaySize(15, 15);
  }

  getKey(): string {
    const key = this.getElement("key") as Phaser.GameObjects.Text;
    return key.text.toLocaleLowerCase();
  }

  setStatus(
    status: "correct" | "incorrect",
    animate = false,
    animateCallback?: () => void
  ) {
    const check = this.getElement("check") as Phaser.GameObjects.Image;
    check.setTexture(`game-${status}-small`).setVisible(true);
    if (animate) {
      const oldScale = check.scale;
      this.tweenChild({
        targets: check,
        duration: 350,
        scale: check.scale * 2,
        yoyo: true,
        ease: "Power2",
        onComplete: () => {
          animateCallback?.();

          // For some reason the yoyo doesn't work with smaller scales.
          check.setScale(oldScale);
        },
      });
    }
  }

  async startSelectedAnimation(status: "correct" | "incorrect") {
    this.setStatus(status);
    const statusImage = this.scene.add
      .image(this.x, this.y, `game-${status}-big`)
      .setScale(0.0, 0.25)
      .setDepth(ZOrder.GAME_QUESTION_CONTAINER);
    return Promise.allSettled([
      new Promise((resolve) =>
        this.scene.tweens.add({
          targets: statusImage,
          duration: 250,
          scaleX: 0.25,
          ease: "Power2",
          onComplete: resolve,
        })
      ),
      new Promise((resolve) =>
        this.scene.tweens.add({
          targets: statusImage,
          duration: 750,
          scaleX: 0.25,
          y: "-=30",
          ease: "Power2",
          onComplete: () => {
            statusImage.destroy();
            resolve(undefined);
          },
        })
      ),
      status === "incorrect" && this.startShakeAnimation(),
    ]);
  }

  startHighlightAnimation() {
    this.tweenSelf({
      targets: this,
      duration: 500,
      scale: 1.05,
      yoyo: true,
      repeat: -1,
    });
  }

  startShowAnimation(delay: number = 0) {
    this.setScale(0.0);
    this.scene.tweens.add({
      targets: this,
      duration: 250,
      scale: 1.0,
      delay,
    });
  }

  startShakeAnimation() {
    this.setAngle(-5);
    this.scene.tweens.add({
      targets: this,
      duration: 75,
      angle: 5,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.setAngle(0);
      },
    });
  }
}
