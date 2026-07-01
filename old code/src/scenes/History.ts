import type ScrollablePanel from "phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel";
import type RexUI from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import { ResponsiveHandler } from "@/libs/responsive";
import { LANG } from "@/config/lang";
import type Label from "phaser3-rex-plugins/templates/ui/label/Label";
import { State } from "@/core/state";
import { dataParsed } from "@/core/data";
import { AnswerContainer2 } from "@/gameobjects/answer-container2";
import { getCenterContainer } from "@/utils/rex-plugin";
import { resizeImageBy } from "@/utils/image";
import { AudioManager } from "@/libs/audio";
import { fitScreen } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";

export class HistoryScene extends Phaser.Scene {
  declare rexUI: RexUI;
  responsiveHandler?: ResponsiveHandler;
  baseScale: number = 1.0;

  // Game objects
  private header: Phaser.GameObjects.Text;
  private back: Label;
  private corrects: Phaser.GameObjects.Text;
  private correctIcon: Phaser.GameObjects.Image;
  private questionContainer: ScrollablePanel;

  constructor() {
    super("History");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    AudioManager.playSFX(this.sound, "audio-reveal");

    this.header = this.add
      .text(0, 0, LANG.HISTORY_HEADER)
      .setFontSize(46 * this.baseScale)
      .setOrigin(0.5, 0.0)
      .setColor("#000000")
      .setFontFamily("reddit-sands-regular");

    // Corrects
    this.corrects = this.add
      .text(0, 0, "0")
      .setOrigin(0.5)
      .setFontStyle("bold")
      .setFontSize(48)
      .setColor("#000000");
    this.correctIcon = this.add.image(0, 0, "game-correct");
    this.refreshCorrects();

    this.createPanel(1, 800, 600);

    this.input.topOnly = false;

    const bg = this.rexUI.add
      .roundRectangle({
        color: 0xffffff,
        width: 300,
        height: 50,
        strokeColor: 0x000000,
        radius: 10,
      })
      .setAlpha(0.5)
      .on(Phaser.Input.Events.POINTER_OUT, () => bg.setAlpha(0.5))
      .on(Phaser.Input.Events.POINTER_OVER, () => bg.setAlpha(0.6))
      .on(Phaser.Input.Events.POINTER_DOWN, this.onBackClick, this);
    setInteractive(bg, this.input);

    this.back = this.rexUI.add.label({
      background: bg,
      text: this.add
        .text(0, 0, LANG.HISTORY_BACK)
        .setFontFamily("reddit-sands-regular")
        .setColor("#000000")
        .setOrigin(0.5)
        .setFontSize(32 * this.baseScale),
      adjustTextFontSize: true,
    });

    this.handleResponsive();
  }

  createPanel(scale: number, width: number, height: number) {
    console.log(800 * scale, 600 * scale);
    // History data
    const childrenContainer = this.rexUI.add.sizer({
      orientation: "vertical",
      width,
      height,
      space: { item: 20 * scale },
    });
    for (let i = 0; i < 1; i++) {
      State.answers.forEach((answer, id) => {
        const question = dataParsed.questions.find((x) => x.id === id);
        if (!question) return;
        const child = this.rexUI.add.sizer({
          space: { top: 10 * scale, bottom: 10 * scale },
        });

        child.addBackground(
          this.rexUI.add.roundRectangle({
            color: 0xffffff,
            alpha: 0.25,
            radius: 5 * scale,
          })
        );

        // Index
        child.add(
          this.add
            .text(0, 0, String(id))
            .setFontFamily("reddit-sands-regular")
            .setColor("#000000")
            .setOrigin(0.5)
            .setFontSize(32 * scale),
          { proportion: 1 }
        );

        // Question Image
        const questionImage = this.add
          .image(0, 0, `game-${question.image}`)
          .setVisible(!!question.image)
          .setScale(0.25 * scale);
        if (scale === 2) resizeImageBy(questionImage, { size: 100, byMax: true }); // Only for mobile
        child.add(getCenterContainer(this, questionImage), { proportion: 1 });

        // Question Text
        const questionText = this.add
          .text(0, 0, question.text ?? "")
          .setFontFamily("reddit-sands-regular")
          .setColor("#000000")
          .setOrigin(0.5)
          .setFontSize(24 * scale)
          .setWordWrapWidth(100 * scale)
          .setVisible(!!question.text)
          .setAlign("center");
        child.add(questionText, { proportion: 2 });

        // Question Answers
        const currentAnswer = question.answers.find(
          (x) => x.key.toLocaleLowerCase() === answer.toLocaleLowerCase()
        );
        if (!currentAnswer) return;
        const correct = question.answers.find(
          (x) =>
            x.key.toLocaleLowerCase() ===
            question.correctAnswer.toLocaleLowerCase()
        );
        if (!correct) return;
        const isSelectedCorrect =
          answer.toLocaleLowerCase() ===
          question.correctAnswer.toLocaleLowerCase();

        // Selected answer
        const answerSelected = this.add.existing(
          new AnswerContainer2(this, {
            status: isSelectedCorrect ? "correct" : "incorrect",
            sizerConfig: { orientation: "vertical" },
          })
        );
        answerSelected.setAnswer(currentAnswer);
        answerSelected.refresh(false);
        answerSelected.layout();
        child.add(getCenterContainer(this, answerSelected), { proportion: 1 });

        // Correct answer
        const correctAnswer = this.add.existing(
          new AnswerContainer2(this, {
            status: "correct",
            sizerConfig: { orientation: "vertical" },
          })
        );
        correctAnswer.setAnswer(correct);
        correctAnswer.setStatus("correct");
        correctAnswer.refresh(false);
        correctAnswer.layout();
        if (isSelectedCorrect) {
          correctAnswer.setVisible(false);
        }
        child.add(getCenterContainer(this, correctAnswer), { proportion: 1 });

        childrenContainer.add(child, { expand: true });

        // Animation
        child.setAlpha(0.0);
        child.tween({
          targets: child,
          duration: 250,
          delay: 250 * (id - 1),
          alpha: 1.0,
        });

        // this.tweens.add({
        //   targets: [answerSelected, correctAnswer],
        //   duration: 250,
        //   scale: 1,
        //   ease: "Power2",
        // });
      });
    }

    this.questionContainer = this.rexUI.add.scrollablePanel({
      width,
      height,

      panel: {
        child: childrenContainer,
        mask: {
          padding: 1,
        },
      },

      slider: {
        track: this.rexUI.add
          .roundRectangle(0, 0, 20 * scale, 10 * scale, 0, 0x000000)
          .setAlpha(0.25),
        thumb: this.rexUI.add.roundRectangle(
          0,
          0,
          20 * scale,
          20 * scale,
          0,
          0x000000
        ),
        hideUnscrollableSlider: true,
      },

      scroller: true,

      mouseWheelScroller: {
        focus: false,
        speed: 0.1,
      },

      space: {
        left: 10 * scale,
        right: 10 * scale,
        top: 10 * scale,
        bottom: 10 * scale,

        panel: 10 * scale,
      },
    });
    // childrenContainer.setMinSize(width, height);
    // this.questionContainer.setMinSize(width, height);
  }

  onBackClick() {
    const { header, back, corrects, correctIcon, questionContainer } = this;

    this.tweens.add({
      targets: [header, back, corrects, correctIcon, questionContainer],
      duration: 500,
      alpha: 0.0,
      onComplete: () => {
        this.scene.stop();
        this.scene.launch("GameComplete");
      },
    });
  }

  refreshCorrects() {
    let amount = 0;
    for (const question of dataParsed.questions) {
      if (!State.answers.has(question.id)) continue;
      if (
        State.answers.get(question.id) ===
        question.correctAnswer.toLocaleLowerCase()
      ) {
        amount++;
      }
    }
    this.corrects.setText(String(amount));
  }

  onShutdown() {
    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
    // Delete game object references.
    Object.assign(this, {
      back: null,
      corrects: null,
      correctIcon: null,
      questionContainer: null,
    });
    this.input.topOnly = true;
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    const { header, back, corrects, correctIcon } = this;

    const debug = this.add.graphics().setDepth(Infinity);
    this.responsiveHandler.events.on("resize", () => {
      const [width, height] = fitScreen(this.scale);

      debug.clear();

      this.baseScale = Math.min(width, 800) / 800;
      header.setFontSize(54);
      corrects.setScale(1.0);
      correctIcon.setScale(1.0);
      back.setScale(1.0);
      if (this.questionContainer) this.questionContainer.destroy();
      console.log(this.baseScale);
      // this.createPanel(this.baseScale, Math.min(width * 0.8, 800), Math.min(height * 0.75, 600));
      this.createPanel(1, 800, 600);
      // questionContainer.setScale(1.0);

      this.questionContainer.setPosition(width / 2, height / 2);
      // this.questionContainer.setMinSize(width * 0.8, height * 0.75);
      this.questionContainer.layout();
      this.questionContainer.setScale(1.0);
      // this.questionContainer.drawBounds(debug, 0xff0000);

      header.setPosition(width / 2, 10);
      back.setPosition(width / 2, height - 30 - 10);

      this.baseScale = Math.min(width, 800) / 800;

      const offset = 10;
      corrects.setPosition(
        width - corrects.displayWidth / 2 - offset,
        offset + corrects.displayHeight / 2
      );
      correctIcon.setPosition(
        corrects.x - corrects.displayWidth / 2 - correctIcon.displayWidth / 2,
        corrects.y
      );
    });

    this.responsiveHandler.events.on("mobile", () => {
      const [width, height] = fitScreen(this.scale);
      const isIpad = width > 900 && height > 900;

      debug.clear();

      if (!isIpad) {
        this.baseScale = Math.min(width, 400) / 400;
        header.setFontSize(20);
        corrects.setScale(0.5);
        correctIcon.setScale(0.5);
        back.setScale(0.5);
        if (this.questionContainer) this.questionContainer.destroy();
        this.createPanel(2, 800, 600);
        // this.createPanel(1);
        // this.questionContainer.setScale(0.4);
      }

      this.questionContainer.setPosition(width / 2, height / 2);
      // this.questionContainer.setMinSize(width * 0.8, height * 0.75);
      this.questionContainer.layout();
      if (!isIpad) this.questionContainer.setScale(0.35);
      // this.questionContainer.drawBounds(debug, 0xff0000);

      header.setPosition(width / 2, 10);
      back.setPosition(width / 2, height - 30 - 10);

      if (!isIpad) this.baseScale = Math.min(width, 400) / 400;

      const offset = 2;
      corrects.setPosition(
        width - corrects.displayWidth / 2 - offset,
        offset + corrects.displayHeight / 2
      );
      correctIcon.setPosition(
        corrects.x - corrects.displayWidth / 2 - correctIcon.displayWidth / 2,
        corrects.y
      );
    });

    this.responsiveHandler.trigger();
  }
}
