import { Scene } from "phaser";
import { ResponsiveHandler } from "@/libs/responsive";
import { getGameData, getMode, isCorrectChoice, type Choice, type Question } from "@/core/data";
import { State } from "@/core/state";
import { Box } from "@/gameobjects/box";
import { ZOrder } from "@/config/zorder";
import { THEME, DECOS } from "@/config/theme";
import { fitScreen, DPR } from "@/utils/responsive";
import { setInteractive } from "@/utils/interactive";
import { AudioManager } from "@/libs/audio";

export class GridScene extends Scene {
  private responsive?: ResponsiveHandler;
  private background!: Phaser.GameObjects.Image;
  private headphones?: Phaser.GameObjects.Image;
  private boxes: Box[] = [];
  private busy = false;

  constructor() {
    super("Grid");
  }

  init() {
    this.responsive = new ResponsiveHandler(this);
    State.reset();
    this.boxes = [];
    this.busy = false;
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    this.background = this.add.image(0, 0, THEME.wood).setDepth(ZOrder.BACKGROUND);
    DECOS.forEach((d) => this.add.image(0, 0, `th-${d}`).setName(d).setDepth(ZOrder.BACKGROUND + 1));

    const questions = getGameData().questions;
    questions.forEach((q, i) => {
      const box = this.add.existing(new Box(this, { index: i, size: 100 }));
      box.setDepth(ZOrder.BOX);
      setInteractive(box, this.input);
      box.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (!box.answered && !this.busy) box.setHovered(true);
      });
      box.on(Phaser.Input.Events.POINTER_OUT, () => {
        if (!box.answered && !this.busy) box.setHovered(false);
      });
      box.on(Phaser.Input.Events.POINTER_DOWN, () => this.openBox(box, q));
      this.boxes.push(box);
    });

    // Intro prop (headphones) that slides off the desk when the game starts.
    this.headphones = this.add.image(0, 0, "th-deco-headphone").setName("headphones").setDepth(ZOrder.BOX_LIFTED);

    this.handleResponsive();
    this.boxes.forEach((b, i) => b.popIn(i * 70));

    this.scene.launch("UI");
    // Show the Start screen over the paused grid; play resumes it (and starts BGM).
    this.scene.launch("Title");
    this.scene.pause();

    // When Play is pressed the grid resumes — slide the intro prop out over the board.
    this.events.once(Phaser.Scenes.Events.RESUME, () => this.slideIntroOut());
  }

  private slideIntroOut() {
    if (!this.headphones) return;
    this.tweens.add({
      targets: this.headphones,
      x: -this.headphones.displayWidth,
      y: -this.headphones.displayHeight,
      angle: -25,
      alpha: 0,
      duration: 600,
      ease: "Back.easeIn",
      onComplete: () => this.headphones?.setVisible(false),
    });
  }

  private async openBox(box: Box, question: Question) {
    if (this.busy || box.answered) return;
    this.busy = true;
    box.setScale(1, 1);
    this.boxes.forEach((b) => b.disableInteractive());
    AudioManager.playSFX(this.sound, "sfx-open");

    // The rest of the grid slides away (staggered); the clicked box hides so the
    // classify notepad can grow out of its position.
    const others = this.boxes.filter((b) => b !== box);
    others.forEach((b, i) => b.slideOut(i * 22));
    box.setVisible(false);
    const origin = { x: box.homeX, y: box.homeY, size: box.homeSize };

    await new Promise((r) => this.time.delayedCall(180, r));

    if (getMode(getGameData()) === "reveal") {
      this.scene.launch("Reveal", { index: box.index, item: question, origin, onResolve: () => this.onRevealed(box) });
    } else {
      this.scene.launch("Question", {
        index: box.index,
        question,
        origin,
        onResolve: (choice: Choice | null) => this.onAnswered(box, question, choice),
      });
    }
    this.scene.pause();
  }

  private closeBox(box: Box, markFn: (b: Box) => void) {
    box.setVisible(true).setDepth(ZOrder.BOX);
    markFn(box);
    // The grid reforms: the other boxes slide back in.
    this.boxes
      .filter((b) => b !== box)
      .forEach((b, i) => b.slideIn(i * 22));
    this.boxes.forEach((b) => {
      if (!b.answered) setInteractive(b, this.input);
    });
    this.busy = false;
  }

  private onRevealed(box: Box) {
    this.scene.resume();
    State.opened.add(box.index);
    AudioManager.playSFX(this.sound, "sfx-correct");
    this.closeBox(box, (b) => b.markOpened());
    this.checkComplete(State.opened.size);
  }

  private onAnswered(box: Box, question: Question, choice: Choice | null) {
    this.scene.resume();
    // choice === null means the per-question timer expired with no answer.
    const correct = choice ? isCorrectChoice(question, choice) : false;
    State.answers.set(box.index, { selectedContent: choice?.content ?? "", correct });
    this.closeBox(box, (b) => b.markAnswered(correct));
    this.checkComplete(State.answers.size);
  }

  private checkComplete(done: number) {
    if (done >= this.boxes.length) {
      this.time.delayedCall(700, () => {
        AudioManager.playSFX(this.sound, "sfx-complete");
        this.scene.launch("Complete");
        this.scene.pause();
      });
    }
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
    const s = Math.min(width, height) / 480;
    const deco = (name: string, x: number, y: number, angle: number) => {
      const img = this.children.getByName(name) as Phaser.GameObjects.Image | null;
      img?.setScale(s).setPosition(x, y).setAngle(angle);
    };
    deco("deco-pencil", width * 0.1, height * 0.9, -20);
    deco("deco-pencil2", width * 0.16, height * 0.86, 15);
    deco("deco-pen", width * 0.93, height * 0.12, 25);
    deco("deco-rubber", width * 0.05, height * 0.82, 0);
    deco("deco-sheet", width * 0.9, height * 0.9, 10);

    // Intro headphones (top-left), only positioned while still visible.
    if (this.headphones?.visible) {
      const hpScale = (width * 0.26) / this.headphones.width;
      this.headphones.setScale(hpScale).setPosition(width * 0.13, height * 0.28);
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
      // Items on the last (possibly partial) row are centered.
      const itemsInRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      const rowWidth = itemsInRow * cellW;
      const rowStartX = width / 2 - rowWidth / 2 + cellW / 2;
      // RTL: box 1 is top-right, numbering runs right-to-left (like the source).
      const x = rowStartX + (itemsInRow - 1 - c) * cellW;
      const y = marginTop + cellH / 2 + r * cellH;
      box.setHome(x, y, size);
    });
  }

  private onShutdown() {
    this.responsive?.destroy();
    this.responsive = undefined;
    this.boxes = [];
  }
}
