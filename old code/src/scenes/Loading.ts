import { Scene } from "phaser";
import { Loading } from "@/gameobjects/loading";
import { ResponsiveHandler } from "@/libs/responsive";
import { State } from "@/core/state";
import { FONT_FAMILY } from "@/config/text";
import { LANG } from "@/config/lang";
import { loadConfig } from "@/utils/config";
import { rawData } from "@/data";

export class LoadingScene extends Scene {
  private responsiveHandler?: ResponsiveHandler;

  constructor() {
    super("Loading");
  }

  init() {
    this.responsiveHandler = new ResponsiveHandler(this);
    const config = loadConfig({ bgm: true, sfx: true });
    State.bgm = config.bgm;
    State.sfx = config.sfx;
  }

  preload() {
    this.load.setPath("assets");
    this.load.spritesheet("loading", "loading.png", {
      frameWidth: 128,
      frameHeight: 128,
    });
    // this.load.setPath('assets/loading');
    // this.load.setPrefix('loading-');

    // this.load.image('background', 'background.png');
  }

  postLoad() {
    this.load.setPath("assets");
    this.load.setPrefix("game-");
    this.load.image("background", "background.webp");
    this.load.svg("next", "next.svg", { scale: 35 });
    this.load.svg("correct", "correct.svg", { scale: 50 });
    this.load.image("correct-big", "correct-big.png");
    this.load.image("incorrect-big", "incorrect-big.png");
    this.load.image("correct-small", "correct-small.webp");
    this.load.image("incorrect-small", "incorrect-small.webp");
    this.load.spritesheet("raster", "sunset-raster.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    rawData.questions.forEach((question, index) => {
      if (question.image) {
        this.load.image(`${index + 1}-image`, question.image);
      }
      question.answers.forEach((answer, answerIndex) => {
        if (answer.image) {
          this.load.image(`${index + 1}-${answerIndex + 1}`, answer.image);
        }
      });
    });
    // this.load.image("1-image", "questions/1/image.jpg");
    // this.load.image("1-a", "questions/1/a.jpg");
    // this.load.image("1-b", "questions/1/b.jpg");
    // this.load.image("1-c", "questions/1/c.png");
    // this.load.image("2-image", "questions/2/image.jpg");
    // this.load.image("2-a", "questions/2/a.jpg");
    // this.load.image("2-b", "questions/2/b.jpg");
    // this.load.image("2-c", "questions/2/c.jpg");
    // this.load.image("3-image", "questions/3/image.jpg");
    // this.load.image("3-a", "questions/3/a.png");
    // this.load.image("3-b", "questions/3/b.jpg");
    // this.load.image("3-c", "questions/3/c.png");
    // this.load.image("4-image", "questions/4/image.png");
    // this.load.image("4-a", "questions/4/a.png");
    // this.load.image("4-b", "questions/4/b.png");
    // this.load.image("4-c", "questions/4/c.jpg");
    // this.load.image("5-image", "questions/5/image.jpg");
    // this.load.image("5-a", "questions/5/a.jpg");
    // this.load.image("5-b", "questions/5/b.jpg");
    // this.load.image("5-c", "questions/5/c.jpg");
    // this.load.image("6-image", "questions/6/image.jpg");
    // this.load.image("6-a", "questions/6/a.jpg");
    // this.load.image("6-b", "questions/6/b.jpg");
    // this.load.image("6-c", "questions/6/c.jpg");
    // this.load.image("7-image", "questions/7/image.jpg");
    // this.load.image("7-a", "questions/7/a.jpg");
    // this.load.image("7-b", "questions/7/b.jpg");
    // this.load.image("7-c", "questions/7/c.jpg");

    this.load.setPrefix("title-");
    this.load.svg("play", "play.svg", { scale: 75 });
    this.load.svg("play-icon", "play-icon.svg", { scale: 4 });
    this.load.image("play-click", "play-click.png");
    this.load.image("play-idle", "play-idle.png");

    this.load.setPrefix("ui-");
    this.load.svg("fullscreen", "ui/fullscreen.svg", { scale: 50 });
    this.load.svg("fullscreen-exit", "ui/fullscreen-exit.svg", { scale: 50 });
    this.load.svg("menu", "ui/menu.svg", { scale: 2 });
    this.load.svg("audio-white", "ui/audio-white.svg", { scale: 50 });
    this.load.svg("audio-muted-white", "ui/audio-muted-white.svg", {
      scale: 50,
    });
    this.load.svg("audio", "ui/audio.svg", { scale: 1 });
    this.load.svg("audio-muted", "ui/audio-muted.svg", { scale: 50 });

    this.load.setPrefix("audio-");
    this.load.svg("icon", "audio/audio.svg", { scale: 2 });
    this.load.svg("icon-muted", "audio/audio-muted.svg", { scale: 2 });
    this.load.audio("background-music", "audio/bgm/background-music.ogg");
    this.load.audio("game-intro", "audio/sfx/game-intro.ogg");
    this.load.audio("chip-minor-1", "audio/sfx/chip-minor-1.ogg");
    this.load.audio("chip-fail-1", "audio/sfx/chip-fail-1.ogg");
    this.load.audio("game-successful", "audio/sfx/game-successful.ogg");
    this.load.audio("reveal", "audio/sfx/reveal.ogg");
    this.load.audio("game-restart", "audio/sfx/game-restart.ogg");
    this.load.audio("game-menu", "audio/sfx/game-menu.ogg");

    this.load.start();
  }

  create() {
    // Events
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
      () => {
        this.postLoad();
      }
    );

    this.add
      .rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        this.cameras.main.height,
        0xffffff
      )
      .setName("background");
    // this.add
    //   .existing(
    //     new Loading(
    //       this,
    //       this.cameras.main.width / 2,
    //       this.cameras.main.height / 2
    //     )
    //   )
    //   .setName("loading");

    // this.add.image(0, 0, 'loading-background').setName('background');
    this.add.graphics().setName("bar");
    this.add
      .text(0, 0, LANG.LOADING_TEXT)
      .setName("loading")
      .setFontStyle("bold")
      .setFontSize(32)
      .setFontFamily(FONT_FAMILY.LOADING)
      .setOrigin(0.5);

    this.handleResponsive();

    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => {
          this.scene.start("Game");

          // State.answers.set(1, "a");
          // State.answers.set(2, "b");
          // State.answers.set(3, "b");
          // this.scene.start("History");

          // this.scene.start("GameComplete", { score: [3, 7], time: 2770 });
        }
      );
      this.cameras.main.fadeOut(350);
    });
    this.cameras.main.fadeIn(350);
  }

  update(time: number, delta: number): void {
    const { width, height } = this.scale;
    const bar = this.children.getByName("bar") as Phaser.GameObjects.Graphics;

    const barWidth = width * 0.75;
    const barHeight = 50;
    bar.clear();
    bar.fillStyle(0x084f8c);
    bar.fillRoundedRect(
      width / 2 - barWidth / 2,
      height / 2 - barHeight / 2,
      barWidth,
      barHeight,
      10
    );
    bar.fillStyle(0x1081c7);
    bar.fillRoundedRect(
      width / 2 - barWidth / 2,
      height / 2 - barHeight / 2,
      barWidth * this.load.progress,
      barHeight,
      10
    );
    bar.lineStyle(2, 0xffffff);
    bar.strokeRoundedRect(
      width / 2 - barWidth / 2,
      height / 2 - barHeight / 2,
      barWidth,
      barHeight,
      10
    );
  }

  onShutdown() {
    if (this.responsiveHandler) {
      this.responsiveHandler.destroy();
      delete this.responsiveHandler;
    }
  }

  handleResponsive() {
    if (!this.responsiveHandler) return;

    // const background = this.children.getByName(
    //   "background"
    // ) as Phaser.GameObjects.Rectangle;
    // const loading = this.children.getByName("loading") as Loading;

    // this.responsiveHandler.events.on("resize", () => {
    //   const { width, height } = this.scale;

    //   background.setPosition(width / 2, height / 2);
    //   background.setSize(width, height);
    //   // background.setPosition(width / 2, height / 2);
    //   // background.setScale(
    //   //   Math.max(width / background.width, height / background.height)
    //   // );

    //   loading.setPosition(width / 2, height / 2);
    // });

    const background = this.children.getByName(
      "background"
    ) as Phaser.GameObjects.Image;
    const loading = this.children.getByName(
      "loading"
    ) as Phaser.GameObjects.Text;

    this.responsiveHandler.events.on("resize", () => {
      const { width, height } = this.scale;

      background.setPosition(width / 2, height / 2);
      background.setScale(
        Math.max(width / background.width, height / background.height)
      );

      loading.setPosition(width / 2, height / 2);
    });

    this.responsiveHandler.trigger();
  }
}
