import { Scene } from "phaser";
import type RexUI from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import { ResponsiveHandler } from "@/libs/responsive";
import { dataParsed } from "@/core/data";
import { QuestionContainer } from "@/gameobjects/question-container";
import { ZOrder } from "@/config/zorder";
import { type GameCompleteData } from "@/scenes/GameComplete";
import { State } from "@/core/state";
import { AudioManager } from "@/libs/audio";
import { paginationArabic } from "@/utils/arabic";
import { DPR, fitScreen } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";

export class GameScene extends Scene {
  declare rexUI: RexUI;
  private responsiveHandler?: ResponsiveHandler;
  private questionIndex: number;
  private nextTimer?: Phaser.Time.TimerEvent;
  private playingTime: number;
  public gameStarted = false;

  // Game objects
  private background: Phaser.GameObjects.Image;
  private questionContainer: QuestionContainer;
  private pageNumber: Phaser.GameObjects.Text;
  private next: Phaser.GameObjects.Image;
  private previous: Phaser.GameObjects.Image;
  private nextTimerBackground: Phaser.GameObjects.Rectangle;
  private nextTimerBar: Phaser.GameObjects.Rectangle;
  private corrects: Phaser.GameObjects.Text;
  private correctIcon: Phaser.GameObjects.Image;
  private confetti: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("Game");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
    this.questionIndex = 0;
    this.playingTime = 0;
    this.gameStarted = false;
    State.answers.clear();
  }

  create() {
    // Events
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.game.events.on("audio-bgm", this.onAudioBGM, this);

    // Background
    this.background = this.add.image(0, 0, "game-background");

    // Question
    // const question = dataParsed.questions[this.questionIndex];
    this.questionContainer = this.add.existing(
      new QuestionContainer(this, {
        x: this.scale.width / 2,
        y: this.scale.height / 2,
        sizerConfig: {
          width: 1000,
        },
      })
    );
    // container.setQuestion(question);
    // container.onShowResult("c");
    this.questionContainer.on("answer-selected", (answerKey: string) => {
      const currentQuestion = dataParsed.questions[this.questionIndex];
      if (State.answers.has(currentQuestion.id)) return;
      State.answers.set(currentQuestion.id, answerKey.toLocaleLowerCase());
      this.refreshCorrects();
      // if (State.answers.size === question.answers.length) {
      //   this.scene.start("Results");
      // }
    });
    this.questionContainer.on("show-result-selected-animation-finished", () => {
      if (this.questionIndex >= dataParsed.questions.length - 1) {
        AudioManager.playSFX(this.sound, "audio-game-successful");
        this.startConfetti();
        this.time.delayedCall(5_000, () => {
          this.onGameComplete();
        });
        return;
      }
      this.nextTimer = this.time.delayedCall(2_000, () => {
        this.selectQuestion("next");
      });
    });
    this.refreshQuestionContainer();

    // Page number
    this.pageNumber = this.add
      .text(
        0,
        0,
        paginationArabic(this.questionIndex + 1, dataParsed.questions.length)
      )
      .setColor("#000000")
      .setOrigin(0.5)
      .setRTL(true)
      .setDepth(ZOrder.GAME_PAGE_NUMBER);
    this.next = this.add
      .image(0, 0, "game-next")
      .setDepth(ZOrder.GAME_PAGE_NUMBER)
      .on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.questionContainer.isAnimatingSelection) return;
        this.selectQuestion("previous");
        // this.input.setDefaultCursor("pointer");
      });
    setInteractive(this.next, this.input);
    this.previous = this.add
      .image(0, 0, "game-next")
      .setFlipX(true)
      .setDepth(ZOrder.GAME_PAGE_NUMBER)
      .on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.questionContainer.isAnimatingSelection) return;
        this.selectQuestion("next");
        // this.input.setDefaultCursor("pointer");
      });
    setInteractive(this.previous, this.input);
    this.nextTimerBackground = this.add
      .rectangle(0, 0, 1, 1, 0x000000, 0.5)
      .setVisible(false)
      .setOrigin(0, 0)
      .setDepth(ZOrder.GAME_PAGE_NUMBER);
    this.nextTimerBar = this.add
      .rectangle(0, 0, 1, 1, 0x000000)
      .setVisible(false)
      .setOrigin(0, 0)
      .setDepth(ZOrder.GAME_PAGE_NUMBER);
    this.refreshPageNumber();

    // Corrects
    this.corrects = this.add
      .text(0, 0, "0")
      .setOrigin(0.5)
      .setFontStyle("bold")
      .setFontSize(48)
      .setColor("#000000");
    this.correctIcon = this.add.image(0, 0, "game-correct");

    this.handleResponsive();
    this.selectQuestion(0, true);
    this.scene.launch("UI");
    this.scene.launch("Title");
    this.scene.pause();
    this.events.once(Phaser.Scenes.Events.RESUME, () => {
      this.gameStarted = true;
      this.questionContainer.showAnimation();
      this.time.delayedCall(2_000, () => {
        // AudioManager.playBGM(this.sound, "audio-background-music", {
        //   loop: true,
        // });
      });
    });
  }

  update(_time: number, delta: number) {
    this.playingTime += delta;
    if (this.nextTimer && !this.nextTimer.hasDispatched) {
      this.nextTimerBackground.setVisible(true);
      this.nextTimerBar.setVisible(true);
      const width =
        this.nextTimerBackground.displayWidth * this.nextTimer.getProgress();
      this.nextTimerBar.setSize(width, this.nextTimerBar.displayHeight);
    } else {
      this.nextTimerBackground.setVisible(false);
      this.nextTimerBar.setVisible(false);
    }
  }

  selectQuestion(value: number | "next" | "previous", force = false) {
    let newIndex = 0;
    if (typeof value === "number") {
      newIndex = Math.max(0, Math.min(value, dataParsed.questions.length - 1));
    } else if (value === "next") {
      newIndex = Math.min(this.questionIndex + 1, dataParsed.questions.length - 1);
    } else if (value === "previous") {
      newIndex = Math.max(this.questionIndex - 1, 0);
    }
    if (newIndex === this.questionIndex && !force) return;
    if (this.nextTimer) {
      this.nextTimer.remove();
      this.nextTimer = undefined;
    }
    this.questionIndex = newIndex;
    this.refreshQuestionContainer();
    this.refreshPageNumber();
    this.responsiveHandler?.trigger();
  }

  refreshQuestionContainer() {
    const currentQuestion = dataParsed.questions[this.questionIndex];
    this.questionContainer.setQuestion(currentQuestion);
    if (State.answers.has(currentQuestion.id)) {
      this.questionContainer.onShowResult(
        State.answers.get(currentQuestion.id)!
      );
    }
  }

  refreshPageNumber() {
    if (this.questionIndex === 0) {
      this.next.setAlpha(0.5);
      this.next.disableInteractive();
    } else {
      this.next.setAlpha(1);
      this.next.setInteractive();
    }
    if (this.questionIndex === dataParsed.questions.length - 1) {
      this.previous.setAlpha(0.5);
      this.previous.disableInteractive();
    } else {
      this.previous.setAlpha(1);
      this.previous.setInteractive();
    }
    // this.pageNumber.setText(
    //   `${this.questionIndex + 1} of ${dataParsed.questions.length}`
    // );
    this.pageNumber.setText(
      paginationArabic(this.questionIndex + 1, dataParsed.questions.length)
    );
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
    this.game.events.off("audio-bgm", this.onAudioBGM, this);

    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
    // Delete game object references.
    Object.assign(this, {
      background: null,
      questionContainer: null,
      pageNumber: null,
      next: null,
      previous: null,
      nextTimerBackground: null,
      nextTimerBar: null,
      corrects: null,
      correctIcon: null,
      confetti: null,
    });
    this.questionIndex = 0;
    State.answers.clear();
  }

  onAudioBGM(value: boolean) {
    if (!this.gameStarted) return;
    if (value) {
      // AudioManager.playBGM(this.sound, "audio-background-music", {
      //   loop: true,
      // });
    } else {
      this.sound.stopAll();
    }
  }

  onGameComplete() {
    this.input.enabled = false;
    this.tweens.add({
      targets: [
        this.questionContainer,
        this.pageNumber,
        this.next,
        this.previous,
        this.nextTimerBackground,
        this.nextTimerBar,
        this.corrects,
        this.correctIcon,
        this.confetti,
      ],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.input.enabled = true; // This is not needed, but it's here for precaution.
        this.scene.pause();
        this.scene.launch("GameComplete", {
          score: [Number(this.corrects.text), dataParsed.questions.length],
          time: this.playingTime,
        } as GameCompleteData);
      },
    });
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;
    const {
      background,
      questionContainer,
      pageNumber,
      next,
      previous,
      nextTimerBackground,
      nextTimerBar,
      corrects,
      correctIcon,
    } = this;

    const debug = this.add.graphics().setDepth(Infinity);
    this.responsiveHandler.events.on("resize", () => {
      const [width, height] = fitScreen(this.scale);

      debug.clear();

      // Sizes
      background.setScale(
        Math.max(width / background.width, height / background.height)
      );
      pageNumber.setFontSize(50);
      next.setScale(1.0);
      previous.setScale(1.0);
      nextTimerBackground.setSize(next.displayWidth, 3);
      corrects.setScale(1.0);
      correctIcon.setScale(1.0);

      // Positions
      background.setPosition(width / 2, height / 2);
      if (this.scale.displaySize.aspectRatio > 1) {
        questionContainer.refresh(
          true,
          Math.min(width * 0.8, 1080),
          Math.min(height * 0.8, 768)
        );
      } else {
        questionContainer.refresh(
          false,
          // Math.min(width * 0.95, 1080),
          // Math.min(height * 0.8, 768)
          width * 0.95,
          height * 0.8
        );
      }
      questionContainer.setPosition(width / 2, height / 2);
      // questionContainer.layout();
      // questionContainer.refreshByBounds(width * 0.8, height * 0.8);
      // this.scale.displaySize.aspectRatio
      // questionContainer.drawBounds(debug, 0xff0000);
      pageNumber.setPosition(width / 2, height - pageNumber.height / 2 - 6);
      next.setPosition(
        pageNumber.x + pageNumber.displayWidth / 2 + next.displayWidth / 2 + 6,
        pageNumber.y
      );
      previous.setPosition(
        pageNumber.x -
          pageNumber.displayWidth / 2 -
          previous.displayWidth / 2 -
          6,
        pageNumber.y
      );
      nextTimerBackground.setPosition(
        previous.x - previous.displayWidth / 2,
        previous.y + previous.displayHeight / 2 + 1
      );
      nextTimerBar.setPosition(nextTimerBackground.x, nextTimerBackground.y);

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

      // Sizes
      background.setScale(
        Math.max(width / background.width, height / background.height)
      );
      if (!isIpad) {
        pageNumber.setFontSize(20 * DPR);
        next.setScale(0.5 * DPR);
        previous.setScale(0.5 * DPR);
        nextTimerBackground.setSize(next.displayWidth, 3);
        corrects.setScale(0.5 * DPR);
        correctIcon.setScale(0.5 * DPR);
      }

      // Positions
      background.setPosition(width / 2, height / 2);
      if (this.scale.displaySize.aspectRatio > 1) {
        questionContainer.refresh(
          true,
          Math.min(width * 0.8, 1080),
          Math.min(height * 0.8, 768)
        );
      } else {
        questionContainer.refresh(
          false,
          // Math.min(width * 0.95, 1080),
          // Math.min(height * 0.8, 768)
          width * 0.95,
          height * 0.8
        );
      }
      questionContainer.setPosition(width / 2, height / 2);
      // questionContainer.setPosition(width / 2, height / 2);
      // questionContainer.layout();
      // questionContainer.refreshByBounds(width * 0.95, height * 0.8);
      // this.scale.displaySize.aspectRatio
      // questionContainer.drawBounds(debug, 0xff0000);
      pageNumber.setPosition(width / 2, height - pageNumber.height / 2 - 6);
      next.setPosition(
        pageNumber.x + pageNumber.displayWidth / 2 + next.displayWidth / 2 + 6,
        pageNumber.y
      );
      previous.setPosition(
        pageNumber.x -
          pageNumber.displayWidth / 2 -
          previous.displayWidth / 2 -
          6,
        pageNumber.y
      );
      nextTimerBackground.setPosition(
        previous.x - previous.displayWidth / 2,
        previous.y + previous.displayHeight / 2 + 1
      );
      nextTimerBar.setPosition(nextTimerBackground.x, nextTimerBackground.y);

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

  startConfetti() {
    const TAU = 2 * Math.PI;
    this.confetti = this.add.particles(0, 0, "game-raster", {
      speed: 100,
      lifespan: 5000,
      gravityY: 100,
      frame: [0, 4, 8, 12, 16],
      x: { min: 0, max: this.scale.width },
      scaleX: {
        onEmit: (particle) => {
          return 1;
        },
        onUpdate: (particle) => {
          // 5 cycles per lifespan
          return Math.cos(TAU * 5 * particle.lifeT);
        },
      },
      rotate: {
        onEmit: (particle) => {
          return 0;
        },
        onUpdate: (particle) => {
          // 1 cycle per lifespan
          return 1 * 360 * particle.lifeT;
        },
      },
    });
  }
}
