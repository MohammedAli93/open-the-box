import { THEME, PAD_CYCLE, coverKey } from "@/config/theme";
import { FONT_FAMILY } from "@/config/text";

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
    this.cover.setPosition(0, -h / 2);
    this.label.setPosition(0, h * 0.46).setFontSize(Math.round(h * 0.3));
    this.setSize(w, h);
    if (this.lock) {
      const s = w * 0.5;
      this.lock.setDisplaySize(s, s * (this.lock.height / this.lock.width)).setPosition(0, h * 0.02);
    }
  }

  setHome(x: number, y: number, size: number) {
    this.homeX = x;
    this.homeY = y;
    this.setPosition(x, y);
    this.applySize(size);
  }

  // Open: the cover folds up off the binding (scaleY → 0 from the top edge).
  flipAway(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.cover,
        scaleY: 0,
        duration: 260,
        ease: "Back.easeIn",
        onComplete: () => resolve(),
      });
    });
  }

  // Close: the cover folds back down over the pad.
  flipBack(): Promise<void> {
    this.cover.scaleY = 0;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.cover,
        scaleY: 1,
        duration: 240,
        ease: "Back.easeOut",
        onComplete: () => resolve(),
      });
    });
  }

  markAnswered(_correct: boolean) {
    this.lockBox();
  }

  markOpened() {
    this.lockBox();
  }

  private lockBox() {
    this.answered = true;
    this.coverImg.setTexture(coverKey("grey"));
    this.label.setAlpha(0.35);
    if (!this.lock) {
      this.lock = this.scene.add.image(0, 0, THEME.lock).setOrigin(0.5);
      this.add(this.lock);
    }
    this.applySize(this.homeSize);
    this.disableInteractive();
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
