import { Scene } from "phaser";
import { ResponsiveHandler } from "@/libs/responsive";
import { getGameData, getMode, isCorrectChoice, type Choice, type Question } from "@/core/data";
import { State } from "@/core/state";
import { Box } from "@/gameobjects/box";
import { QuizBoard } from "@/gameobjects/quiz-board";
import { ZOrder } from "@/config/zorder";
import { THEME, DECOS } from "@/config/theme";
import { FONT_FAMILY } from "@/config/text";
import { LANG } from "@/config/lang";
import { fitScreen, DPR } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";
import { AudioManager } from "@/libs/audio";

interface BoardLayout {
  width: number;
  height: number;
  wpX: number; // travel waypoint (screen centre) the pad drifts through
  wpY: number;
  restX: number; // notepad resting centre
  restY: number;
  boardSize: number; // pad size at rest (pad height ≈ boardSize)
  choices: { cx: number; cy: number; w: number; h: number };
}

export class GridScene extends Scene {
  private responsive?: ResponsiveHandler;
  private background!: Phaser.GameObjects.Image;
  private headphones?: Phaser.GameObjects.Image;
  private introProps: Phaser.GameObjects.Image[] = []; // corner props that fly out on play
  private boxes: Box[] = [];
  private busy = false;
  private playable = false; // becomes true only after Play is pressed

  // The whole open → answer → close cycle now happens in THIS scene (no scene
  // swap), so we track the box that's out on the answer board.
  private activeBox?: Box;
  private activeBoard?: QuizBoard;
  private boardLanded = false;
  private hint?: Phaser.GameObjects.Text; // "tap to continue" (reveal mode)

  constructor() {
    super("Grid");
  }

  init() {
    this.responsive = new ResponsiveHandler(this);
    State.reset();
    this.boxes = [];
    this.busy = false;
    this.playable = false;
    this.activeBox = undefined;
    this.activeBoard = undefined;
    this.boardLanded = false;
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    this.background = this.add.image(0, 0, THEME.wood).setDepth(ZOrder.BACKGROUND);
    // Corner props sit ABOVE the boxes so they sweep over the board as they leave.
    this.introProps = DECOS.map((d) =>
      this.add.image(0, 0, `th-${d}`).setName(d).setDepth(ZOrder.BOX_LIFTED)
    );

    const questions = getGameData().questions;
    questions.forEach((q, i) => {
      const box = this.add.existing(new Box(this, { index: i, size: 100 }));
      // Print the item on the pad now, hidden under the cover until it folds open.
      box.setContent(q.text, q.image);
      box.setDepth(ZOrder.BOX);
      setInteractive(box, this.input);
      box.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (this.playable && !box.answered && !this.busy) box.setHovered(true);
      });
      box.on(Phaser.Input.Events.POINTER_OUT, () => {
        if (this.playable && !box.answered && !this.busy) box.setHovered(false);
      });
      box.on(Phaser.Input.Events.POINTER_DOWN, () => this.openBox(box, q));
      this.boxes.push(box);
    });

    // Intro prop (headphones) that slides off the desk when the game starts.
    this.headphones = this.add.image(0, 0, "th-deco-headphone").setName("headphones").setDepth(ZOrder.BOX_LIFTED);
    this.introProps.push(this.headphones);

    this.handleResponsive();
    this.boxes.forEach((b, i) => b.popIn(i * 70));

    this.scene.launch("UI");
    // Show the Start screen over the paused grid; play resumes it (and starts BGM).
    this.scene.launch("Title");
    this.scene.pause();

    // When Play is pressed the grid resumes — enable play, start the global
    // countdown, and fly the props out.
    this.events.once(Phaser.Scenes.Events.RESUME, () => {
      this.playable = true;
      State.timerActive = true;
      State.timerRemaining = Math.max(0, getGameData().timerSeconds ?? 0);
      this.flyIntroOut();
    });
  }

  // Each corner prop shoots off its own corner of the screen, staggered and fast,
  // clearing the desk before play.
  private flyIntroOut() {
    const [width, height] = fitScreen(this.scale);
    this.introProps.forEach((img, i) => {
      if (!img || !img.visible) return;
      const dx = img.x < width / 2 ? -1 : 1;
      const dy = img.y < height / 2 ? -1 : 1;
      this.tweens.add({
        targets: img,
        x: img.x + dx * (width * 0.55 + img.displayWidth),
        y: img.y + dy * (height * 0.55 + img.displayHeight),
        angle: img.angle + dx * 25,
        alpha: 0,
        delay: i * 260,
        duration: 720,
        ease: "Back.easeIn",
        onComplete: () => img.setVisible(false),
      });
    });
  }

  // The full cycle, all in this scene so the pad is one continuous object with no
  // scene swap / snap:
  //  1. the other boxes fly up while the clicked box holds its place;
  //  2. its cover folds up in place, revealing the item already on the pad;
  //  3. the same pad grows and glides to the answer board;
  //  4. the choices drop in (quiz) or we wait for a tap (reveal);
  //  5. the pad shrinks back to its grid slot and the grid reforms.
  private async openBox(box: Box, question: Question) {
    if (!this.playable || this.busy || box.answered) return;
    this.busy = true;
    this.activeBox = box;
    this.boardLanded = false;
    this.boxes.forEach((b) => b.disableInteractive());

    const others = this.boxes.filter((b) => b !== box);
    others.forEach((b, i) => b.slideOut(i * 22));
    box.setDepth(ZOrder.BOX_LIFTED);

    // Cover folds up in place — the item is already printed on the pad beneath it.
    AudioManager.playSFX(this.sound, "sfx-open");
    await box.openCover();

    // Let the board clear a touch, then the same pad grows out and glides over.
    await this.wait(140);
    const L = this.boardLayout();
    await box.moveToBoard(L.wpX, L.wpY, L.restX, L.restY, L.boardSize);
    this.boardLanded = true;

    if (getMode(getGameData()) === "reveal") {
      await this.waitForContinue();
      this.boardLanded = false;
      box.setDepth(ZOrder.BOX);
      await box.returnHome();
      this.onRevealed(box);
    } else {
      this.activeBoard = new QuizBoard(this, question);
      const choice = await this.activeBoard.run(L.choices);
      this.activeBoard = undefined;
      this.boardLanded = false;
      box.setDepth(ZOrder.BOX);
      await box.returnHome();
      this.onAnswered(box, question, choice);
    }
    this.activeBox = undefined;
  }

  // Reveal mode: the opened pad is showing its item — wait for a tap to continue.
  private waitForContinue(): Promise<void> {
    const [width, height] = fitScreen(this.scale);
    if (!this.hint) {
      this.hint = this.add
        .text(0, 0, LANG.REVEAL_NEXT, { fontFamily: FONT_FAMILY.REGULAR, color: "#7a6a4a" })
        .setOrigin(0.5)
        .setRTL(true)
        .setDepth(ZOrder.QUESTION);
    }
    this.hint.setVisible(true);
    this.positionHint(width, height);
    return new Promise((resolve) => {
      this.time.delayedCall(450, () => {
        this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
          this.hint?.setVisible(false);
          resolve();
        });
      });
    });
  }

  private positionHint(width: number, height: number) {
    this.hint?.setPosition(width / 2, height * 0.9).setFontSize(Math.round(Math.min(width, height) * 0.045));
  }

  // Where the answer board lives: notepad resting on the right (RTL), choices on
  // the left in landscape; stacked in portrait.
  private boardLayout(): BoardLayout {
    const [width, height] = fitScreen(this.scale);
    const landscape = width / height > 1.15;
    let restX: number;
    let restY: number;
    let boardSize: number;
    let choices: BoardLayout["choices"];
    if (landscape) {
      boardSize = height * 0.62;
      restX = width * 0.74;
      restY = height * 0.5;
      choices = { cx: width * 0.34, cy: height * 0.5, w: width * 0.5, h: height * 0.82 };
    } else {
      boardSize = height * 0.32;
      restX = width * 0.5;
      restY = height * 0.27;
      choices = { cx: width * 0.5, cy: height * 0.66, w: width * 0.96, h: height * 0.54 };
    }
    return { width, height, wpX: width * 0.5, wpY: restY, restX, restY, boardSize, choices };
  }

  private onRevealed(box: Box) {
    State.opened.add(box.index);
    AudioManager.playSFX(this.sound, "sfx-correct");
    this.finish(box, (b) => b.markOpened(), State.opened.size);
  }

  private onAnswered(box: Box, question: Question, choice: Choice | null) {
    // choice === null means no answer was recorded (e.g. game already ended).
    const correct = choice ? isCorrectChoice(question, choice) : false;
    State.answers.set(box.index, { selectedContent: choice?.content ?? "", correct });
    this.finish(box, (b) => b.markAnswered(correct, question.text), State.answers.size);
  }

  // The answered box settles into its final look; the grid reforms around it.
  private finish(box: Box, markFn: (b: Box) => void, done: number) {
    markFn(box);
    this.boxes.filter((b) => b !== box).forEach((b, i) => b.slideIn(i * 22));
    this.boxes.forEach((b) => {
      if (!b.answered) setInteractive(b, this.input);
    });
    this.busy = false;
    this.checkComplete(done);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private checkComplete(done: number) {
    if (done >= this.boxes.length) this.endGame();
  }

  private endGame() {
    this.busy = true;
    this.boxes.forEach((b) => b.disableInteractive());
    this.time.delayedCall(700, () => {
      AudioManager.playSFX(this.sound, "sfx-complete");
      this.scene.launch("Complete");
      this.scene.pause();
    });
  }

  private handleResponsive() {
    if (!this.responsive) return;
    this.responsive.events.on("resize", () => this.layout());
    this.responsive.trigger();
  }

  private layout() {
    const [width, height] = fitScreen(this.scale);

    // Cover background.
    this.background
      .setPosition(width / 2, height / 2)
      .setScale(Math.max(width / this.background.width, height / this.background.height));

    // Scatter the desk decorations near the edges (scaled to screen).
    // Big corner props (only positioned while still on the desk — once they've
    // flown out on play they stay gone).
    const s = (Math.min(width, height) / 480) * 1.7;
    const deco = (name: string, x: number, y: number, angle: number) => {
      const img = this.children.getByName(name) as Phaser.GameObjects.Image | null;
      if (img?.visible) img.setScale(s).setPosition(x, y).setAngle(angle);
    };
    deco("deco-pencil", width * 0.1, height * 0.9, -20);
    deco("deco-pencil2", width * 0.16, height * 0.86, 15);
    deco("deco-pen", width * 0.92, height * 0.12, 25);
    deco("deco-rubber", width * 0.06, height * 0.82, 0);
    deco("deco-sheet", width * 0.9, height * 0.9, 10);

    // Intro headphones (top-left), only positioned while still visible.
    if (this.headphones?.visible) {
      const hpScale = (width * 0.34) / this.headphones.width;
      this.headphones.setScale(hpScale).setPosition(width * 0.15, height * 0.3);
    }

    const n = this.boxes.length;
    if (n === 0) return;

    // Reserve a margin; lay boxes in a grid sized to the screen aspect.
    // Top margin also clears the UI bar (mute button + score) on tall screens.
    const marginX = width * 0.06;
    const marginTop = Math.max(height * 0.05, 95 * DPR);
    const marginBottom = Math.max(height * 0.05, 30 * DPR);
    const areaW = width - marginX * 2;
    const areaH = height - marginTop - marginBottom;
    const aspect = areaW / areaH;

    let cols = Math.max(1, Math.round(Math.sqrt(n * aspect)));
    cols = Math.min(cols, n);
    let rows = Math.ceil(n / cols);
    // Avoid a very sparse last layout on extreme aspects.
    while (cols > 1 && (cols - 1) * rows >= n) cols--;
    rows = Math.ceil(n / cols);

    const cellW = areaW / cols;
    const cellH = areaH / rows;
    const size = Math.min(cellW, cellH) * 0.86;

    this.boxes.forEach((box, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      // A partial last row is centered under the full rows.
      const itemsInRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      const rowStartX = width / 2 - (itemsInRow * cellW) / 2 + cellW / 2;
      // RTL: box 1 is top-right, numbering runs right-to-left (like the source).
      const x = rowStartX + (itemsInRow - 1 - c) * cellW;
      const y = marginTop + cellH / 2 + r * cellH;
      // While a box is out on the board (or others are slid off), only store the
      // slot so the reform lands correctly — don't yank anything back to the grid.
      if (this.busy) box.setHomeSlot(x, y, size);
      else box.setHome(x, y, size);
    });

    // Keep a landed board (and its choices) glued to the new layout on resize.
    if (this.busy && this.boardLanded && this.activeBox) {
      const L = this.boardLayout();
      this.activeBox.placeOnBoard(L.restX, L.restY, L.boardSize);
      this.activeBoard?.relayout(L.choices);
      if (this.hint?.visible) this.positionHint(L.width, L.height);
    }
  }

  private onShutdown() {
    this.responsive?.destroy();
    this.responsive = undefined;
    this.boxes = [];
    this.activeBox = undefined;
    this.activeBoard = undefined;
    this.hint = undefined;
  }
}
