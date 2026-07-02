import { Scene } from "phaser";
import { ResponsiveHandler } from "@/libs/responsive";
import { getGameData, isCorrectChoice, type Choice, type Question } from "@/core/data";
import { State } from "@/core/state";
import { ChoiceButton } from "@/gameobjects/choice-button";
import { TEXT_COLORS, WORD_COLOR } from "@/config/colors";
import { THEME, CRUMBLE } from "@/config/theme";
import { ZOrder } from "@/config/zorder";
import { FONT_FAMILY } from "@/config/text";
import { fitScreen } from "@/utils/responsive";
import { fitText, fitImage } from "@/utils/layout";
import { setInteractive } from "@/utils/interactive";
import { AudioManager } from "@/libs/audio";
import { AnimationManager } from "@/libs/animation";

interface QuestionSceneData {
  index: number;
  question: Question;
  origin?: { x: number; y: number; size: number };
  onResolve: (choice: Choice | null) => void; // null = timed out
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The answer screen: the word/question shown on a big lined notepad, and the
// choices as lined-paper note cards to classify it.
export class QuestionScene extends Scene {
  private responsive?: ResponsiveHandler;
  private sceneData!: QuestionSceneData;
  private question!: Question;
  private anim!: AnimationManager;
  private answered = false;

  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Container;
  private notepad!: Phaser.GameObjects.Image;
  private notepadRings!: Phaser.GameObjects.Image;
  private word?: Phaser.GameObjects.Text;
  private picture?: Phaser.GameObjects.Image;
  private buttons: ChoiceButton[] = [];

  constructor() {
    super("Question");
  }

  init(data: QuestionSceneData) {
    this.sceneData = data;
    this.question = data.question;
    this.answered = false;
    this.buttons = [];
    this.responsive = new ResponsiveHandler(this);
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.anim = new AnimationManager(this);

    if (!this.anims.exists(CRUMBLE.anim)) {
      this.anims.create({
        key: CRUMBLE.anim,
        frames: this.anims.generateFrameNumbers(CRUMBLE.key, { start: 0, end: CRUMBLE.frames - 1 }),
        frameRate: 14,
        repeat: 0,
      });
    }

    // Light overlay only — the boxes have slid away so the wood desk shows through.
    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.12).setOrigin(0.5).setDepth(ZOrder.QUESTION - 1);
    this.panel = this.add.container(0, 0).setDepth(ZOrder.QUESTION);

    // The word/question lives on a big real spiral notepad.
    this.notepad = this.add.image(0, 0, THEME.pad("blue")).setOrigin(0.5);
    this.notepadRings = this.add.image(0, 0, THEME.rings).setOrigin(0.5);
    this.panel.add([this.notepad, this.notepadRings]);

    if (this.question.text && (this.question.type === "text" || this.question.type === "both")) {
      this.word = this.add
        .text(0, 0, this.question.text, {
          fontFamily: FONT_FAMILY.BOLD,
          color: "#" + WORD_COLOR.toString(16).padStart(6, "0"),
          align: "center",
        })
        .setOrigin(0.5)
        .setRTL(true);
      this.panel.add(this.word);
    }
    if (this.question.image && (this.question.type === "image" || this.question.type === "both")) {
      this.picture = this.add.image(0, 0, this.question.image).setOrigin(0.5);
      this.panel.add(this.picture);
    }

    const wobble = [-3, 2.5, -2.5, 3, -1.5, 2];
    this.question.choices.forEach((choice, i) => {
      const button = new ChoiceButton(this, choice, i, TEXT_COLORS[i % TEXT_COLORS.length]);
      button.setBaseAngle(wobble[i % wobble.length]);
      this.panel.add(button);
      setInteractive(button, this.input);
      button.on(Phaser.Input.Events.POINTER_OVER, () => !this.answered && button.setHover(true));
      button.on(Phaser.Input.Events.POINTER_OUT, () => !this.answered && button.setHover(false));
      button.on(Phaser.Input.Events.POINTER_DOWN, () => this.choose(button));
      this.buttons.push(button);
    });

    this.handleResponsive();

    // Open: the notepad grows out of the clicked box's position, then the
    // category cards drop in from the top (matching the source).
    const [w, h] = fitScreen(this.scale);
    const origin = this.sceneData.origin;
    const ox = origin ? origin.x : w / 2;
    const oy = origin ? origin.y : h / 2;
    // Box → board, slow and deliberate: (1) the board grows out of the clicked
    // box with the word visible the whole time, drifting toward the left, then
    // (2) glides smoothly across to its resting spot, and only then (3) the
    // answer cards drop in. The cards stay hidden until it lands.
    const restX = w / 2;
    const leftX = restX - restX * 0.2;
    this.buttons.forEach((b) => b.setAlpha(0));
    this.panel.setPosition(ox, oy).setScale(0.3);
    this.tweens.add({
      targets: this.panel,
      x: leftX,
      y: h / 2,
      scale: 1,
      duration: 950,
      ease: "Sine.easeOut",
      onComplete: () =>
        this.tweens.add({
          targets: this.panel,
          x: restX,
          duration: 950,
          ease: "Sine.easeInOut",
          onComplete: () => this.begin(),
        }),
    });
  }

  // Answers fall from the top onto their places.
  private begin() {
    this.buttons.forEach((b, i) => b.dropIn(i * 130));
  }

  private async choose(button: ChoiceButton) {
    if (this.answered) return;
    this.answered = true;
    this.buttons.forEach((b) => b.disableInteractive());
    this.input.setDefaultCursor("default");

    const correct = isCorrectChoice(this.question, button.choice);
    // A correct answer refills the global countdown (handled in UI). A wrong one
    // leaves it draining.
    if (correct) State.timerRemaining = Math.max(0, getGameData().timerSeconds ?? 0);
    AudioManager.playSFX(this.sound, correct ? "sfx-correct" : "sfx-wrong");
    await this.resolveBoard(button, correct);
    this.close(button.choice);
  }

  // Shared feedback (matches the source): stamp the picked card and the correct
  // answer, fade the rest away, pause, then every paper crumples together.
  private async resolveBoard(selected: ChoiceButton | null, correct: boolean) {
    const correctBtn = this.buttons.find((b) => isCorrectChoice(this.question, b.choice));
    // Quick camera feedback (colour flash; a shake when wrong) on top of the
    // card fade/crumple sequence.
    if (correct) this.anim.flash(0x2fa85f, 0.3);
    else {
      this.anim.flash(0xc0392b, 0.3);
      this.anim.shake(220, 0.006);
    }
    if (selected) selected.stamp(correct ? "correct" : "incorrect");
    if (correctBtn) correctBtn.stamp("correct");
    // Everything that isn't the picked card or the correct answer fades out.
    this.buttons.forEach((b) => {
      if (b !== correctBtn && b !== selected) b.fadeOut();
    });

    // Let the result register, then all papers crumple at the same time.
    await this.wait(850);
    await Promise.all(this.buttons.map((b) => b.crumple(0)));
    await this.wait(250);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private close(choice: Choice | null) {
    // The board shrinks back toward the box's grid spot, which then reappears
    // showing the word + tick (or a lock).
    const o = this.sceneData.origin;
    this.tweens.add({
      targets: this.panel,
      x: o ? o.x : this.panel.x,
      y: o ? o.y : this.panel.y,
      scale: 0.08,
      alpha: 0,
      duration: 300,
      ease: "Back.easeIn",
      onComplete: () => {
        this.sceneData.onResolve(choice);
        this.scene.stop();
      },
    });
  }

  private handleResponsive() {
    if (!this.responsive) return;
    this.responsive.events.on("resize", () => this.layout());
    this.responsive.trigger();
  }

  private layout() {
    const [width, height] = fitScreen(this.scale);
    this.overlay.setPosition(width / 2, height / 2).setSize(width, height);
    this.panel.setPosition(width / 2, height / 2);

    const W = Math.min(width * 0.96, 1400);
    const H = height * 0.94;
    const landscape = width / height > 1.15;

    let notepadRect: Rect;
    let choiceRect: Rect;
    if (landscape) {
      // Notepad on the right (RTL), choices on the left.
      notepadRect = { x: W * 0.26, y: 0, w: W * 0.42, h: H };
      choiceRect = { x: -W * 0.24, y: 0, w: W * 0.48, h: H };
    } else {
      notepadRect = { x: 0, y: -H * 0.27, w: W * 0.9, h: H * 0.42 };
      choiceRect = { x: 0, y: H * 0.2, w: W, h: H * 0.54 };
    }

    // Notepad + the word/image written on it (rings overlay the pad's top).
    fitImage(this.notepad, notepadRect.w, notepadRect.h);
    this.notepad.setPosition(notepadRect.x, notepadRect.y);
    this.notepadRings
      .setDisplaySize(this.notepad.displayWidth, this.notepad.displayHeight)
      .setPosition(notepadRect.x, notepadRect.y);
    const padW = this.notepad.displayWidth;
    const padH = this.notepad.displayHeight;
    const paperCx = notepadRect.x;
    const paperCy = notepadRect.y + padH * 0.04; // paper centre (below the spiral)
    const both = !!this.word && !!this.picture;
    if (this.picture) {
      const ih = both ? padH * 0.4 : padH * 0.62;
      fitImage(this.picture, padW * 0.72, ih);
      this.picture.setPosition(paperCx, both ? paperCy - padH * 0.18 : paperCy);
    }
    if (this.word) {
      const wh = both ? padH * 0.3 : padH * 0.66;
      fitText(this.word, padW * 0.74, wh, { max: Math.round(padH * 0.5) });
      this.word.setPosition(paperCx, both ? paperCy + padH * 0.22 : paperCy);
    }

    this.layoutChoices(choiceRect);
  }

  private layoutChoices(rect: Rect) {
    const n = this.buttons.length;
    const cols = n <= 2 ? (rect.w / rect.h > 1 ? 2 : 1) : 2;
    const rows = Math.ceil(n / cols);
    // Bigger cards, packed closer together.
    const gapX = rect.w * 0.015;
    const gapY = rect.h * 0.025;
    const cellW = (rect.w - gapX * (cols - 1)) / cols;
    const cellH = (rect.h - gapY * (rows - 1)) / rows;
    const size = Math.min(cellW, cellH * 1.15);
    const cardW = size * 0.99;
    const cardH = Math.min(cellH * 0.99, cardW * 0.95);

    this.buttons.forEach((button, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const itemsInRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      const rowW = itemsInRow * cellW + (itemsInRow - 1) * gapX;
      // RTL: first choice on the right of its row.
      const startX = rect.x + rowW / 2 - cellW / 2;
      const x = startX - c * (cellW + gapX);
      const y = rect.y - rect.h / 2 + cellH / 2 + r * (cellH + gapY);
      button.setPosition(x, y);
      button.layout(cardW, cardH);
    });
  }

  private onShutdown() {
    this.responsive?.destroy();
    this.responsive = undefined;
    this.buttons = [];
  }
}
