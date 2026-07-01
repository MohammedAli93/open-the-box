import Phaser from "phaser";
import RexUIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import { LoadingScene } from "@/scenes/Loading";
import { TitleScene } from "@/scenes/Title";
import { GameScene } from "@/scenes/Game";
import { UIScene } from "@/scenes/UI";
import { MenuScene } from "@/scenes/Menu";
import { AudioScene } from "@/scenes/Audio";
import { GameCompleteScene } from "@/scenes/GameComplete";
import { HistoryScene } from "./scenes/History";
import type Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";

function fitInContainer(container: Sizer, image: Phaser.GameObjects.Image) {
  const scaleWidth = container.displayWidth / image.frame.realWidth;
  const scaleHeight = container.displayHeight / image.frame.realHeight;
  const scale = Math.min(scaleWidth, scaleHeight);
  image.setScale(scale);
}

class MainScene extends Phaser.Scene {
  declare rexUI: RexUIPlugin;
  questionContainer: Sizer;
  debug: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "MainScene" });
  }

  preload() {
    this.load.image("1-image", "assets/questions/1/image.jpg");
    this.load.image("2-image", "assets/questions/2/image.jpg");
    this.load.image("3-image", "assets/questions/3/image.jpg");
    this.load.image("4-image", "assets/questions/4/image.png");
    this.load.image("5-image", "assets/questions/5/image.jpg");
    this.load.image("6-image", "assets/questions/6/image.jpg");
    this.load.image("7-image", "assets/questions/7/image.jpg");
  }

  create() {
    this.debug = this.add.graphics().setDepth(Infinity);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.questionContainer = this.rexUI.add.sizer({
      orientation: "vertical",
      space: { item: 10 },
    });
    this.questionContainer.addBackground(this.rexUI.add.roundRectangle(0, 0, 1, 1, 10, 0x222222));
    this.questionContainer.add(this.add.text(0, 0, "Question"), { proportion: 5, key: "text" });
    const innerContainer = this.rexUI.add.sizer({
      orientation: "horizontal",
      space: { item: 10 },
    });
    this.questionContainer.add(innerContainer, { proportion: 95, expand: true, key: "inner-container" });

    innerContainer.addBackground(this.rexUI.add.roundRectangle(0, 0, 1, 1, 10, 0x898989));
    const imageContainer = this.rexUI.add.sizer().addSpace(1).add(this.add.image(0, 0, "1-image"), { key: "image" }).addSpace(1);
    innerContainer.add(imageContainer, { proportion: 2, key: "image-container", expand: true });
    // const answersContainer = this.rexUI.add.sizer().addSpace(1).add(this.add.text(0, 0, "Answer"), { key: "text" }).addSpace(1);
    const answersContainer = this.rexUI.add.sizer({
      orientation: "vertical",
      // space: { item: 10 },
    });
    innerContainer.add(answersContainer, { proportion: 1, key: "answers-container", expand: true });
    answersContainer.addSpace(1);
    for (let i = 0; i < 3; i++) {
      const answer = this.rexUI.add.sizer();
      answer.add(this.add.rectangle(0, 0, 1, 1, Math.random() * 0xFFFFFF), { key: "rect" });
      answersContainer.add(answer, { key: `answer-${i + 1}`, expand: false });
    }
    answersContainer.addSpace(1);
    this.onResize();

    this.input.keyboard?.on("keydown-SPACE", () => {
      const image = imageContainer.getElement("image") as Phaser.GameObjects.Image;
      const numberFromImage = parseInt(image.texture.key.split("-")[0]);
      let newNumber = numberFromImage + 1;
      if (newNumber > 7) newNumber = 1;
      image.setTexture(`${newNumber}-image`);
      this.onResize();
    });
  }

  onResize() {
    const { width, height } = this.scale;
    this.debug.clear();

    // Get elements
    const text = this.questionContainer.getElement("text") as Phaser.GameObjects.Text;
    const innerContainer = this.questionContainer.getElement("inner-container") as Sizer;
    const imageContainer = innerContainer.getElement("image-container") as Sizer;
    const image = imageContainer.getElement("image") as Phaser.GameObjects.Image;
    const answersContainer = innerContainer.getElement("answers-container") as Sizer;
    const answerContainer1 = answersContainer.getElement("answer-1") as Sizer;
    const answerContainer2 = answersContainer.getElement("answer-2") as Sizer;
    const answerContainer3 = answersContainer.getElement("answer-3") as Sizer;
    const answer1 = answerContainer1.getElement("rect") as Phaser.GameObjects.Rectangle;
    const answer2 = answerContainer2.getElement("rect") as Phaser.GameObjects.Rectangle;
    const answer3 = answerContainer3.getElement("rect") as Phaser.GameObjects.Rectangle;
    const answers = [answer1, answer2, answer3];
    // image.setScale(0);
    // answer1.setSize()

    // We need to reset the size of any element that is inside a `Sizer` (not the `Sizer` itself) to get the correct dimensions before doing the first layout.
    image.setDisplaySize(0, 0);
    answers.forEach((answer) => answer.setSize(0, 0));

    // Layout to adjust the size of the container
    if (this.scale.displaySize.aspectRatio > 1) {
      // Desktop
      this.questionContainer.setMinSize(Math.min(width * 0.8, 1080), Math.min(height * 0.8, 768));
      innerContainer.setOrientation("horizontal");
    } else {
      // Mobile
      this.questionContainer.setMinSize(Math.min(width * 0.95, 1080), Math.min(height * 0.8, 768));
      innerContainer.setOrientation("vertical");
    }
    this.questionContainer.layout();

    // console.log("innerContainer", innerContainer.displayWidth, innerContainer.displayHeight);
    // console.log("imageContainer", imageContainer.displayWidth, imageContainer.displayHeight);
    // console.log("text2", text2.displayWidth, text2.displayHeight);
    // text.setFontSize(Math.floor(this.questionContainer.minHeight * 0.05))

    // Sizes
    // console.log(this.questionContainer.displayWidth, this.questionContainer.displayHeight);
    text.setFontSize(text.displayHeight);
    fitInContainer(imageContainer, image);
    const HORIZONTAL = 0;
    const answersContainerWidth = innerContainer.orientation === HORIZONTAL
      ? answersContainer.displayWidth
      : image.displayWidth;
    const answersContainerHeight = innerContainer.orientation === HORIZONTAL
      ? image.displayHeight
      : answersContainer.displayHeight;
    const answersContainerAspectRatio = answersContainerWidth / answersContainerHeight;
    if (answersContainerAspectRatio > 1.5) {
      // Landscape
      answersContainer.setOrientation("horizontal");
      answers.forEach((answer) => answer.setSize(answersContainerWidth / 3, answersContainerHeight));
    } else {
      // Portrait
      answersContainer.setOrientation("vertical");
      answers.forEach((answer) => answer.setSize(answersContainerWidth, answersContainerHeight / 3));
    }

    // Final layout
    this.questionContainer.layout();
    this.questionContainer.setPosition(width / 2, height / 2);
    this.questionContainer.drawBounds(this.debug, 0xff0000);
  }
}

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: 1024,
  height: 768,
  parent: "game-container",
  backgroundColor: "#028af8",
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  scene: [
    // MainScene,
    LoadingScene,
    GameScene,
    TitleScene,
    HistoryScene,
    GameCompleteScene,
    UIScene,
    MenuScene,
    AudioScene,
  ],
  plugins: {
    scene: [
      {
        key: "rexUI",
        plugin: RexUIPlugin,
        mapping: "rexUI",
      },
    ],
  },
};

export type PhaserScene = Phaser.Scene & { rexUI: RexUIPlugin };

export default new Phaser.Game(config);
