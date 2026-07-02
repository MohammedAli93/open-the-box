import { getGameData, isCorrectChoice, type Choice, type Question } from "@/core/data";
import { State } from "@/core/state";
import { ChoiceButton } from "@/gameobjects/choice-button";
import { TEXT_COLORS } from "@/config/colors";
import { CRUMBLE } from "@/config/theme";
import { ZOrder } from "@/config/zorder";
import { setInteractive } from "@/utils/interactive";
import { AudioManager } from "@/libs/audio";
import { AnimationManager } from "@/libs/animation";

export interface BoardRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

// The answer-choice cards for a question, laid out around the persistent word
// board and living in the SAME scene as the grid — no scene swap, no dark
// overlay, no grow-from-zero. The category cards drop in one by one; picking one
// stamps the result, fades the rest, and crumples every paper. Resolves with the
// chosen Choice (or null if never answered).
export class QuizBoard {
  private scene: Phaser.Scene;
  private question: Question;
  private anim: AnimationManager;
  private buttons: ChoiceButton[] = [];
  private answered = false;
  private resolve!: (choice: Choice | null) => void;

  constructor(scene: Phaser.Scene, question: Question) {
    this.scene = scene;
    this.question = question;
    this.anim = new AnimationManager(scene);

    if (!scene.anims.exists(CRUMBLE.anim)) {
      scene.anims.create({
        key: CRUMBLE.anim,
        frames: scene.anims.generateFrameNumbers(CRUMBLE.key, { start: 0, end: CRUMBLE.frames - 1 }),
        frameRate: 14,
        repeat: 0,
      });
    }

    const wobble = [-3, 2.5, -2.5, 3, -1.5, 2];
    this.question.choices.forEach((choice, i) => {
      const button = new ChoiceButton(scene, choice, i, TEXT_COLORS[i % TEXT_COLORS.length]);
      button.setBaseAngle(wobble[i % wobble.length]);
      button.setDepth(ZOrder.QUESTION).setAlpha(0);
      scene.add.existing(button);
      setInteractive(button, scene.input);
      button.on(Phaser.Input.Events.POINTER_OVER, () => !this.answered && button.setHover(true));
      button.on(Phaser.Input.Events.POINTER_OUT, () => !this.answered && button.setHover(false));
      button.on(Phaser.Input.Events.POINTER_DOWN, () => this.choose(button));
      this.buttons.push(button);
    });
  }

  // Lay the cards out, drop them in, and resolve once the player answers.
  run(rect: BoardRect): Promise<Choice | null> {
    this.layout(rect);
    this.buttons.forEach((b, i) => b.dropIn(i * 130));
    return new Promise((resolve) => (this.resolve = resolve));
  }

  // Reposition on resize (the board itself is repositioned by the Grid).
  relayout(rect: BoardRect) {
    this.layout(rect);
  }

  private layout(rect: BoardRect) {
    const n = this.buttons.length;
    const cols = n <= 2 ? (rect.w / rect.h > 1 ? 2 : 1) : 2;
    const rows = Math.ceil(n / cols);
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
      const startX = rect.cx + rowW / 2 - cellW / 2;
      const x = startX - c * (cellW + gapX);
      const y = rect.cy - rect.h / 2 + cellH / 2 + r * (cellH + gapY);
      button.setPosition(x, y);
      button.layout(cardW, cardH);
    });
  }

  private async choose(button: ChoiceButton) {
    if (this.answered) return;
    this.answered = true;
    this.buttons.forEach((b) => b.disableInteractive());
    this.scene.input.setDefaultCursor("default");

    const correct = isCorrectChoice(this.question, button.choice);
    // A correct answer refills the global countdown (handled in UI); a wrong one
    // leaves it draining.
    if (correct) State.timerRemaining = Math.max(0, getGameData().timerSeconds ?? 0);
    AudioManager.playSFX(this.scene.sound, correct ? "sfx-correct" : "sfx-wrong");

    await this.resolveBoard(button, correct);
    this.destroy();
    this.resolve(button.choice);
  }

  // Stamp the picked card and the correct answer, fade the rest, pause, then
  // every paper crumples together (matches the source).
  private async resolveBoard(selected: ChoiceButton, correct: boolean) {
    const correctBtn = this.buttons.find((b) => isCorrectChoice(this.question, b.choice));
    if (correct) this.anim.flash(0x2fa85f, 0.3);
    else {
      this.anim.flash(0xc0392b, 0.3);
      this.anim.shake(220, 0.006);
    }
    selected.stamp(correct ? "correct" : "incorrect");
    if (correctBtn) correctBtn.stamp("correct");
    this.buttons.forEach((b) => {
      if (b !== correctBtn && b !== selected) b.fadeOut();
    });

    await this.wait(850);
    await Promise.all(this.buttons.map((b) => b.crumple(0)));
    await this.wait(200);
    // The crumpled papers are tossed off the desk (up + fade) rather than just
    // vanishing, like the source.
    await new Promise<void>((resolve) => {
      let done = 0;
      const n = this.buttons.length || 1;
      this.buttons.forEach((b, i) =>
        this.scene.tweens.add({
          targets: b,
          y: b.y - 40 - i * 6,
          alpha: 0,
          angle: (b.angle || 0) + (i % 2 ? 12 : -12),
          duration: 300,
          delay: i * 30,
          ease: "Back.easeIn",
          onComplete: () => ++done >= n && resolve(),
        })
      );
      if (!this.buttons.length) resolve();
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  private destroy() {
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
  }
}
