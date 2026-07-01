import { ZOrder } from "@/config/zorder";
// import { IDataQuestion } from "@/core/data";
import { type PhaserScene } from "@/main";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import { AnswerContainer } from "@/gameobjects/answer-container";
import { resizeImageBy } from "@/utils/image";
import { getCenterContainer } from "@/utils/rex-plugin";
import { UniqueColor } from "@/config/colors";
import { AudioManager } from "@/libs/audio";
import { type Question } from "@/data";
import { setInteractive } from "@/utils/interactive";

interface IQuestionContainerConfig {
  x?: number;
  y?: number;
  sizerConfig?: Sizer.IConfig;
}

function fitInContainer(container: Sizer, image: Phaser.GameObjects.Image) {
  const scaleWidth = container.displayWidth / image.frame.realWidth;
  const scaleHeight = container.displayHeight / image.frame.realHeight;
  const scale = Math.min(scaleWidth, scaleHeight);
  image.setScale(scale);
}

export class QuestionContainer extends Sizer {
  declare scene: PhaserScene;
  private _question: Question;
  public isAnimatingSelection = false;

  constructor(scene: PhaserScene, config?: IQuestionContainerConfig) {
    const { x = 0, y = 0, sizerConfig } = config || {};
    super(scene, x, y, {
      orientation: "vertical",
      // space: { item: 10 },
      ...sizerConfig,
    });

    this.setDepth(ZOrder.GAME_QUESTION_CONTAINER);

    // Text
    this.add(
      scene.add
        .text(0, 0, "")
        .setFontFamily("elmessiri-regular")
        .setAlign("center")
        // .setRTL(true)
        .setColor("#000000"),
      {
        key: "text",
        proportion: 10,
      }
    );

    const innerContainer = scene.rexUI.add.sizer({
      orientation: "horizontal",
      // space: { item: 10 },
    });
    this.add(innerContainer, {
      key: "inner-container",
      proportion: 90,
      expand: true,
      // align: "center",
      // padding: { left: 10, right: 10 },
    });

    // Image
    innerContainer.add(
      getCenterContainer(scene, scene.add.image(0, 0, "__NORMAL"), {
        add: { key: "image" },
      }),
      { key: "image-container", proportion: 2, expand: true }
    );

    // Answers
    const answersContainer = scene.rexUI.add.sizer({
      orientation: "horizontal",
    });
    innerContainer.add(answersContainer, {
      key: "answers-container",
      proportion: 1,
      expand: true,
    });
    const answersContainer1 = scene.rexUI.add.sizer({
      orientation: "vertical",
      space: { item: 15 },
    });
    const answersContainer2 = scene.rexUI.add.sizer({
      orientation: "vertical",
      space: { item: 15 },
    });
    answersContainer.add(answersContainer1, {
      key: "answers-container-1",
      proportion: 1,
      expand: true,
    });
    answersContainer.add(answersContainer2, {
      key: "answers-container-2",
      proportion: 1,
      expand: true,
    });
  }

  refresh(isDesktop: boolean, width: number, height: number) {
    // Get elements
    const text = this.getElement("text") as Phaser.GameObjects.Text;
    const innerContainer = this.getElement("inner-container") as Sizer;
    const imageContainer = innerContainer.getElement(
      "image-container"
    ) as Sizer;
    const image = imageContainer.getElement(
      "image"
    ) as Phaser.GameObjects.Image;
    const answersContainer = innerContainer.getElement(
      "answers-container"
    ) as Sizer;
    const answersContainer1 = answersContainer.getElement(
      "answers-container-1"
    ) as Sizer;
    const answersContainer2 = answersContainer.getElement(
      "answers-container-2"
    ) as Sizer;
    const answers1 = answersContainer1
      .getChildren()
      .filter(
        (answer) => answer instanceof AnswerContainer
      ) as AnswerContainer[];
    const answers2 = answersContainer2
      .getChildren()
      .filter(
        (answer) => answer instanceof AnswerContainer
      ) as AnswerContainer[];

    // We need to reset the size of any element that is inside a `Sizer` (not the `Sizer` itself) to get the correct dimensions before doing the first layout.
    text.setFontSize(0);
    text.setScale(1);
    image.setDisplaySize(0, 0);
    answers1.forEach((answer) => answer.resetSize());
    answers2.forEach((answer) => answer.resetSize());

    // Layout to adjust the size of the container
    if (isDesktop) {
      // Desktop
      this.setMinSize(width, height);
      innerContainer.setOrientation("horizontal");
    } else {
      // Mobile
      this.setMinSize(width, height);
      innerContainer.setOrientation("vertical");
    }
    this.layout();

    // Sizes
    if (text) {
      // if (isDesktop) {
      //   text.setFontSize(text.displayHeight);
      // } else {
      //   text.setFontSize(text.displayHeight * 0.75);
      // }
      // text.setWordWrapWidth(width);

      // text.setFontSize(text.displayHeight);
      // if (text.displayWidth > width) {
      //   text.setScale(width / text.displayWidth);
      // }

      // console.log(text.displayWidth, text.displayHeight);
      const textHeight = text.displayHeight;
      // text.setFontSize(text.displayHeight);
      // if (text.displayWidth > width) {
      //   text.setWordWrapWidth(width);
      //   text.setScale(textHeight / text.displayHeight);
      // }

      let fontSize = textHeight;
      text.setFontSize(fontSize);

      while (text.displayWidth > width || text.displayHeight > textHeight) {
        fontSize--;
        text.setFontSize(fontSize);
        text.setWordWrapWidth(width);
      }

      this.bringChildToTop(text);
    }
    text.setPadding(text.displayHeight * 0.1);
    for (const container of [
      [answersContainer1, answers1],
      [answersContainer2, answers2],
    ] as const) {
      const [answersContainer, answers] = container;
      let answersContainerWidth = 0;
      let answersContainerHeight = 0;
      if (this._question.image) {
        fitInContainer(imageContainer, image);
        const HORIZONTAL = 0;
        answersContainerWidth =
          innerContainer.orientation === HORIZONTAL
            ? answersContainer.displayWidth
            : image.displayWidth;
        answersContainerHeight =
          innerContainer.orientation === HORIZONTAL
            ? image.displayHeight
            : answersContainer.displayHeight;
      } else {
        answersContainerWidth = answersContainer.displayWidth;
        answersContainerHeight = answersContainer.displayHeight;
      }
      const answersContainerAspectRatio =
        answersContainerWidth / answersContainerHeight;
      if (answersContainerAspectRatio > 1.5) {
        // Landscape
        answersContainer.setOrientation("horizontal");
        answers.forEach((answer) =>
          answer.rrefresh(answersContainerWidth / 3, answersContainerHeight)
        );
      } else {
        // Portrait
        answersContainer.setOrientation("vertical");
        answers.forEach((answer) =>
          answer.rrefresh(answersContainerWidth, answersContainerHeight / 3)
        );
      }
    }

    // Final layout
    this.layout();
  }

  setQuestion(question: Question) {
    this._question = question;
    const text = this.getElement("text") as Phaser.GameObjects.Text;
    const innerContainer = this.getElement("inner-container") as Sizer;
    const imageContainer = innerContainer.getElement(
      "image-container"
    ) as Sizer;
    const image = imageContainer.getElement(
      "image"
    ) as Phaser.GameObjects.Image;
    const answersContainer = innerContainer.getElement(
      "answers-container"
    ) as Sizer;
    const answersContainer1 = answersContainer.getElement(
      "answers-container-1"
    ) as Sizer;
    const answersContainer2 = answersContainer.getElement(
      "answers-container-2"
    ) as Sizer;

    text.setVisible(false);
    image.setVisible(false);

    this.remove(text);
    innerContainer.remove(imageContainer);
    answersContainer.remove(answersContainer1);
    answersContainer.remove(answersContainer2);
    const doubleContainer = question.answers.length > 3;
    if (doubleContainer) {
      answersContainer.add(answersContainer1, {
        key: "answers-container-1",
        proportion: 1,
        expand: true,
      });
      answersContainer.add(answersContainer2, {
        key: "answers-container-2",
        proportion: 1,
        expand: true,
      });
    } else {
      answersContainer.add(answersContainer1, {
        key: "answers-container-1",
        proportion: 1,
        expand: true,
      });
    }
    if (question.text) {
      this.add(text, { index: 0, key: "text", proportion: 10 });
      text.setText(question.text);
      text.setVisible(true);
    }
    if (question.image) {
      innerContainer.add(imageContainer, {
        index: 0,
        key: "image-container",
        proportion: doubleContainer ? 1 : 2,
        expand: true,
      });
      image.setTexture(`game-${question.image}`);
      image.setVisible(true);
    }
    this.layout();

    // Answers
    answersContainer1.clear(true);
    answersContainer2.clear(true);
    let highestAnswerHeight = 0;
    const listOfAnswers: AnswerContainer[] = [];
    const uniqueColor = new UniqueColor();
    answersContainer1.addSpace(1);
    answersContainer2.addSpace(1);
    question.answers.forEach((answer, index) => {
      let container: Sizer;
      if (question.answers.length === 4) {
        container = index <= 1 ? answersContainer1 : answersContainer2;
      } else {
        container = index <= 2 ? answersContainer1 : answersContainer2;
      }
      const answerContainer = new AnswerContainer(this.scene, {
        color: uniqueColor.getRandomColor(),
      });

      // Assign answer data
      answerContainer.setAnswer(answer);

      // Interactive
      setInteractive(answerContainer, this.scene.input);
      answerContainer.on(Phaser.Input.Events.POINTER_OVER, () => {
        answerContainer.setAlpha(0.75);
      });

      answerContainer.on(Phaser.Input.Events.POINTER_OUT, () => {
        answerContainer.setAlpha(1);
      });

      answerContainer.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.disableAllAnswersInteractivity();
        this.scene.input.setDefaultCursor("default");
        const isCorrect = answer.key === question.correctAnswer;
        this.isAnimatingSelection = true;
        answerContainer
          .startSelectedAnimation(isCorrect ? "correct" : "incorrect")
          .then(() => {
            this.onShowResult(answer.key, true);
            this.isAnimatingSelection = false;
            // answerContainer.setStatus("correct", true);
          });
        if (isCorrect) {
          AudioManager.playSFX(this.scene.sound, "audio-chip-minor-1");
        } else {
          AudioManager.playSFX(this.scene.sound, "audio-chip-fail-1");
        }
        this.emit("answer-selected", answer.key);
      });

      container.add(answerContainer, {
        key: `answer-${index + 1}`,
        expand: false,
      });
      answerContainer.layout();
      if (answerContainer.displayHeight > highestAnswerHeight) {
        highestAnswerHeight = answerContainer.displayHeight;
      }
      listOfAnswers.push(answerContainer);
    });
    answersContainer1.addSpace(1);
    answersContainer2.addSpace(1);
    listOfAnswers.forEach((answerContainer) => {
      answerContainer.setMinHeight(highestAnswerHeight);
    });
    // this.fixSize();

    this.layout();
  }

  onShowResult(key: string, selectedAnimation = false) {
    this.disableAllAnswersInteractivity();
    const groups = this.getAnswersBySelection(key);
    groups.correct.selected.forEach((child) => {
      child.setStatus("correct");
      if (selectedAnimation) {
        this.emit("show-result-selected-animation-finished");
      } else {
        child.startHighlightAnimation();
      }
    });
    groups.correct.unSelected.forEach((child) => {
      if (selectedAnimation) {
        child.setStatus("correct", true, () => {
          this.emit("show-result-selected-animation-finished");
        });
      } else {
        child.setStatus("correct");
      }
    });
    groups.incorrect.selected.forEach((child) => {
      child.setStatus("incorrect");
      if (!selectedAnimation) child.startHighlightAnimation();
    });
    groups.incorrect.unSelected.forEach((child) => {
      child.setAlpha(0.5);
    });
  }

  private disableAllAnswersInteractivity() {
    const innerContainer = this.getElement("inner-container") as Sizer;
    const answersContainer = innerContainer.getElement(
      "answers-container"
    ) as Sizer;
    const answersContainer1 = answersContainer.getElement(
      "answers-container-1"
    ) as Sizer;
    const answersContainer2 = answersContainer.getElement(
      "answers-container-2"
    ) as Sizer;
    for (const answersContainer of [answersContainer1, answersContainer2]) {
      const answersChildren = answersContainer
        .getChildren()
        .filter(
          (answer) => answer instanceof AnswerContainer
        ) as AnswerContainer[];
      answersChildren.forEach((child) => {
        child.disableInteractive();
      });
    }
  }

  private getAnswersBySelection(selection: string) {
    selection = selection.toLocaleLowerCase();
    const innerContainer = this.getElement("inner-container") as Sizer;
    const answersContainer = innerContainer.getElement(
      "answers-container"
    ) as Sizer;
    const answersContainer1 = answersContainer.getElement(
      "answers-container-1"
    ) as Sizer;
    const answersContainer2 = answersContainer.getElement(
      "answers-container-2"
    ) as Sizer;
    const answersChildren1 = answersContainer1
      .getChildren()
      .filter(
        (answer) => answer instanceof AnswerContainer
      ) as AnswerContainer[];
    const answersChildren2 = answersContainer2
      .getChildren()
      .filter(
        (answer) => answer instanceof AnswerContainer
      ) as AnswerContainer[];
    const answersChildren = [...answersChildren1, ...answersChildren2];
    const groups = {
      correct: {
        selected: [] as AnswerContainer[],
        unSelected: [] as AnswerContainer[],
      },
      incorrect: {
        selected: [] as AnswerContainer[],
        unSelected: [] as AnswerContainer[],
      },
    };
    answersChildren.forEach((child) => {
      const key = child.getKey();
      if (key === this._question.correctAnswer.toLocaleLowerCase()) {
        if (key === selection) {
          groups.correct.selected.push(child);
        } else {
          groups.correct.unSelected.push(child);
        }
      } else {
        if (key === selection) {
          groups.incorrect.selected.push(child);
        } else {
          groups.incorrect.unSelected.push(child);
        }
      }
    });
    return groups;
  }

  showAnimation() {
    const innerContainer = this.getElement("inner-container") as Sizer;
    const answersContainer = innerContainer.getElement(
      "answers-container"
    ) as Sizer;
    const answersContainer1 = answersContainer.getElement(
      "answers-container-1"
    ) as Sizer;
    const answersContainer2 = answersContainer.getElement(
      "answers-container-2"
    ) as Sizer;
    for (const answersContainer of [answersContainer1, answersContainer2]) {
      const answersChildren = answersContainer
        .getChildren()
        .filter(
          (answer) => answer instanceof AnswerContainer
        ) as AnswerContainer[];
      answersChildren.forEach((child, index) => {
        child.startShowAnimation(index * 250);
      });
    }
  }
}
