import { THEME, PAD_CYCLE, coverKey } from "@/config/theme";
import { FONT_FAMILY } from "@/config/text";
import { fitText } from "@/utils/layout";

interface BoxConfig {
  index: number; // 0-based
  size: number;
}

// An "Open the Box" spiral pad: a coloured cover (with its number) that FOLDS up
// off the spiral binding when clicked, revealing the lined pad underneath. Once
// answered it greys out and shows a lock, like the source.
export class Box extends Phaser.GameObjects.Container {
  public readonly index: number;
  public homeX = 0;
  public homeY = 0;
  public homeSize: number;
  public answered = false;

  private padBody: Phaser.GameObjects.Image; // lined pad revealed on open
  private cover: Phaser.GameObjects.Container; // folds up
  private coverImg: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private rings: Phaser.GameObjects.Image;
  private lock?: Phaser.GameObjects.Image;
  private coverHomeY = 0; // resting y of the cover (top edge, under the rings)
  // When answered correctly the box stays open, showing the word + a green tick.
  private revealed = false;
  private revealText?: string | null;
  private wordText?: Phaser.GameObjects.Text;
  private tick?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, config: BoxConfig) {
    super(scene, 0, 0);
    this.index = config.index;
    this.homeSize = config.size;
    const color = PAD_CYCLE[config.index % PAD_CYCLE.length];

    this.padBody = scene.add.image(0, 0, THEME.pad("white")).setOrigin(0.5);
    this.coverImg = scene.add.image(0, 0, coverKey(color)).setOrigin(0.5, 0);
    this.label = scene.add
      .text(0, 0, String(config.index + 1), { fontFamily: FONT_FAMILY.BOLD, color: "#2a2a2a" })
      .setOrigin(0.5)
      .setRTL(true);
    this.cover = scene.add.container(0, 0, [this.coverImg, this.label]);
    this.rings = scene.add.image(0, 0, THEME.rings).setOrigin(0.5);

    this.add([this.padBody, this.cover, this.rings]);
    this.applySize(config.size);
  }

  private padDims(size: number) {
    const ratio = this.padBody.height / this.padBody.width; // ~1.16 portrait
    let w = size;
    let h = size * ratio;
    if (h > size) {
      h = size;
      w = size / ratio;
    }
    return { w, h };
  }

  applySize(size: number) {
    this.homeSize = size;
    const { w, h } = this.padDims(size);
    this.padBody.setDisplaySize(w, h);
    this.rings.setDisplaySize(w, h);
    this.coverImg.setDisplaySize(w, h);
    // Cover pivots on the top edge (just under the rings).
    this.coverHomeY = -h / 2;
    this.cover.setPosition(0, this.coverHomeY).setScale(1);
    this.label.setPosition(0, h * 0.46).setFontSize(Math.round(h * 0.3));
    this.setSize(w, h);
    if (this.lock) {
      const s = w * 0.5;
      this.lock.setDisplaySize(s, s * (this.lock.height / this.lock.width)).setPosition(0, h * 0.02);
    }
    if (this.revealed) this.layoutReveal(w, h);
  }

  // Correctly-answered box: cover folded away, the word on the pad + a tick below.
  private layoutReveal(w: number, h: number) {
    this.cover.setScale(1, 0); // fold the cover flat so the pad shows
    const hasWord = !!this.revealText;
    if (hasWord) {
      if (!this.wordText) {
        this.wordText = this.scene.add
          .text(0, 0, this.revealText!, { fontFamily: FONT_FAMILY.BOLD, color: "#2a2a2a", align: "center" })
          .setOrigin(0.5)
          .setRTL(true);
        this.add(this.wordText);
      }
      this.wordText.setVisible(true);
      fitText(this.wordText, w * 0.82, h * 0.46, { max: Math.round(h * 0.24) });
      this.wordText.setPosition(0, -h * 0.08);
    }
    if (!this.tick) {
      this.tick = this.scene.add.image(0, 0, "correct-big").setOrigin(0.5);
      this.add(this.tick);
    }
    const ts = w * (hasWord ? 0.34 : 0.5);
    this.tick
      .setVisible(true)
      .setDisplaySize(ts, ts * (this.tick.height / this.tick.width))
      .setPosition(0, hasWord ? h * 0.3 : 0);
  }

  setHome(x: number, y: number, size: number) {
    this.homeX = x;
    this.homeY = y;
    this.setPosition(x, y);
    this.applySize(size);
  }

  // Grid clears: this box flies up off the desk and fades (staggered).
  slideOut(delay = 0): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        y: this.homeY - this.homeSize * 1.9,
        alpha: 0,
        angle: -6,
        delay,
        duration: 300,
        ease: "Back.easeIn",
        onComplete: () => resolve(),
      });
    });
  }

  // Grid reforms: this box drops back down from above to its home position.
  slideIn(delay = 0): Promise<void> {
    this.setPosition(this.homeX, this.homeY - this.homeSize * 1.9).setAlpha(0).setAngle(0);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        y: this.homeY,
        alpha: 1,
        delay,
        duration: 320,
        ease: "Back.easeOut",
        onComplete: () => resolve(),
      });
    });
  }

  // Click: the clicked box holds its place while the others fly off, then its
  // cover (first page) folds up off the binding — like opening a book — to
  // reveal the pad, just before the answer board grows out of it.
  openCover(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.killTweensOf(this.cover);
      this.scene.tweens.add({
        targets: this.cover,
        y: this.coverHomeY - this.homeSize * 0.12,
        scaleY: 0,
        duration: 320,
        ease: "Quad.easeIn",
        onComplete: () => resolve(),
      });
    });
  }

  // Correct → the box stays open showing the word + a green tick. Wrong (or no
  // answer) → it locks like the source.
  markAnswered(correct: boolean, text?: string | null) {
    if (correct) {
      this.answered = true;
      this.revealed = true;
      this.revealText = text;
      this.scene.tweens.killTweensOf(this.cover);
      this.applySize(this.homeSize);
      this.disableInteractive();
    } else {
      this.lockBox();
    }
  }

  markOpened() {
    this.lockBox();
  }

  private lockBox() {
    this.answered = true;
    this.scene.tweens.killTweensOf(this.cover);
    this.coverImg.setTexture(coverKey("grey"));
    this.label.setAlpha(0.35);
    if (!this.lock) {
      this.lock = this.scene.add.image(0, 0, THEME.lock).setOrigin(0.5);
      this.add(this.lock);
    }
    this.applySize(this.homeSize);
    this.disableInteractive();
  }

  // Hover: only the cover (first page) lifts off the pad, like the corner of a
  // book cover being raised. The box itself does not zoom.
  setHovered(on: boolean) {
    if (this.answered) return;
    const lift = this.homeSize * 0.06;
    this.scene.tweens.killTweensOf(this.cover);
    this.scene.tweens.add({
      targets: this.cover,
      y: on ? this.coverHomeY - lift : this.coverHomeY,
      duration: 140,
      ease: "Quad.easeOut",
    });
  }

  popIn(delay: number) {
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 320,
      delay,
      ease: "Back.easeOut",
    });
  }
}
