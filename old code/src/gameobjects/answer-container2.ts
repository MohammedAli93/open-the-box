import { COLORS } from "@/config/colors";
import { ZOrder } from "@/config/zorder";
import { type IDataQuestionAnswer } from "@/core/data";
import { type PhaserScene } from "@/main";
import { resizeImageBy } from "@/utils/image";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";

interface IAnswerContainerConfig {
  x?: number;
  y?: number;
  sizerConfig?: Sizer.IConfig;
  status?: "none" | "correct" | "incorrect";
}

export class AnswerContainer2 extends Sizer {
  constructor(scene: PhaserScene, config?: IAnswerContainerConfig) {
    const { x = 0, y = 0, sizerConfig, status = "none" } = config || {};
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
      color: Phaser.Utils.Array.GetRandom(COLORS),
      radius: 10,
    });
    this.addBackground(background);

    // Key
    this.add(scene.add.text(0, 0, ""), {
      key: "key",
    });

    // Image
    this.add(scene.add.image(0, 0, "__NORMAL"), {
      key: "image",
    });

    // Text
    this.add(scene.add.text(0, 0, ""), {
      key: "text",
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

  setAnswer(answer: IDataQuestionAnswer) {
    const key = this.getElement("key") as Phaser.GameObjects.Text;
    const image = this.getElement("image") as Phaser.GameObjects.Image;
    const text = this.getElement("text") as Phaser.GameObjects.Text;
    // const check = this.getElement("check") as Phaser.GameObjects.Image;

    key.setText(answer.key);

    text.setVisible(false);
    image.setVisible(false);

    if (answer.text) {
      text.setText(answer.text);
      text.setVisible(true);
    }
    if (answer.image) {
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
    check
      .setTexture(`game-${status}-small`)
      .setVisible(true);
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
}
