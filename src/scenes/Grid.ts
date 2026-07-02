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
  private introProps: Phaser.GameObjects.Image[] = []; // corner props that fly out on play
  private boxes: Box[] = [];
  private busy = false;
  private playable = false; // becomes true only after Play is pressed

  constructor() {
    super("Grid");
  }

  init() {
    this.responsive = new ResponsiveHandler(this);
    State.reset();
    this.boxes = [];
    this.busy = false;
    this.playable = false;
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

  private async openBox(box: Box, question: Question) {
    if (!this.playable || this.busy || box.answered) return;
    this.busy = true;
    box.setScale(1, 1);
    this.boxes.forEach((b) => b.disableInteractive());
    const origin = { x: box.homeX, y: box.homeY, size: box.homeSize };

    // The other boxes fly up off the desk (staggered) while the clicked box
    // holds its place, lifted above them.
    const others = this.boxes.filter((b) => b !== box);
    others.forEach((b, i) => b.slideOut(i * 22));
    box.setDepth(ZOrder.BOX_LIFTED);

    // Once the board has cleared, the clicked box's cover folds open — then the
    // answer board grows out of its position.
    await new Promise((r) => this.time.delayedCall(240, r));
    AudioManager.playSFX(this.sound, "sfx-open");
    await box.openCover();
    box.setVisible(false).setDepth(ZOrder.BOX);

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
    this.closeBox(box, (b) => b.markAnswered(correct, question.text));
    this.checkComplete(State.answers.size);
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
      box.setHome(x, y, size);
    });
  }

  private onShutdown() {
    this.responsive?.destroy();
    this.responsive = undefined;
    this.boxes = [];
  }
}
