import { THEME, PAD_CYCLE, coverKey } from "@/config/theme";
import { FONT_FAMILY } from "@/config/text";
import { WORD_COLOR } from "@/config/colors";
import { isRTL, locNum } from "@/config/lang";
import { fitText, fitImage } from "@/utils/layout";

interface BoxConfig {
  index: number; // 0-based
  size: number;
}

// An "Open the Box" spiral pad. The item (word / image) is printed on the lined
// pad but HIDDEN under a coloured cover (with its number). Clicking folds the
// cover up off the spiral binding — in place — revealing the item already there.
// The very same object then grows and glides to the answer board (no scene swap,
// no pop-in). Once answered it either stays open with the word + a green tick
// (correct) or greys out with a lock (wrong / opened), like the source.
export class Box extends Phaser.GameObjects.Container {
  public readonly index: number;
  public homeX = 0;
  public homeY = 0;
  public homeSize: number; // resting grid size (never overwritten by board sizing)

  public answered = false;

  private padBody: Phaser.GameObjects.Image; // lined pad revealed on open
  private content: Phaser.GameObjects.Container; // word/image printed on the pad
  private wordText?: Phaser.GameObjects.Text;
  private pictures: Phaser.GameObjects.Image[] = []; // one or many images on the pad
  private contentText: string | null = null;
  private contentImages: string[] = [];

  private cover: Phaser.GameObjects.Container; // folds up
  private coverImg: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private rings: Phaser.GameObjects.Image;
  private lock?: Phaser.GameObjects.Image;
  private coverHomeY = 0; // resting y of the cover (top edge, under the rings)
  private curSize: number; // the size the pad is currently laid out to

  // opened  = cover folded away, the item on the pad showing (during play/travel).
  // revealed = answered-correct: stays open showing the word + a green tick.
  private opened = false;
  private revealed = false;
  private tick?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, config: BoxConfig) {
    super(scene, 0, 0);
    this.index = config.index;
    this.homeSize = config.size;
    this.curSize = config.size;
    const color = PAD_CYCLE[config.index % PAD_CYCLE.length];

    this.padBody = scene.add.image(0, 0, THEME.pad("white")).setOrigin(0.5);
    this.content = scene.add.container(0, 0);
    this.coverImg = scene.add.image(0, 0, coverKey(color)).setOrigin(0.5, 0);
    this.label = scene.add
      .text(0, 0, locNum(config.index + 1), { fontFamily: FONT_FAMILY.BOLD, color: "#2a2a2a" })
      .setOrigin(0.5)
      .setRTL(isRTL());
    this.cover = scene.add.container(0, 0, [this.coverImg, this.label]);
    this.rings = scene.add.image(0, 0, THEME.rings).setOrigin(0.5);

    // Order matters: the pad, then the hidden item, then the cover (which hides
    // the item until it folds), then the spiral rings on top.
    this.add([this.padBody, this.content, this.cover, this.rings]);
    this.applySize(config.size);
  }

  // Print the item on the pad, hidden under the cover until it folds open.
  // `images` may be a single path, many paths (laid out in a row), or none.
  setContent(text: string | null, images?: string | string[] | null) {
    this.contentText = text ?? null;
    this.contentImages =
      images == null ? [] : (Array.isArray(images) ? images : [images]).filter(Boolean);

    if (this.contentText) {
      if (!this.wordText) {
        this.wordText = this.scene.add
          .text(0, 0, this.contentText, {
            fontFamily: FONT_FAMILY.BOLD,
            color: "#" + WORD_COLOR.toString(16).padStart(6, "0"),
            align: "center",
          })
          .setOrigin(0.5)
          .setRTL(isRTL());
        this.content.add(this.wordText);
      } else {
        this.wordText.setText(this.contentText);
      }
    }
    // (Re)build one image object per path.
    this.pictures.forEach((p) => p.destroy());
    this.pictures = this.contentImages.map((key) => {
      const im = this.scene.add.image(0, 0, key).setOrigin(0.5);
      this.content.add(im);
      return im;
    });
    this.applySize(this.curSize);
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

  // Lay the pad out to `size` (pad height ≈ size). Does NOT touch homeSize, so
  // growing to the answer board and shrinking back never corrupt the grid slot.
  applySize(size: number) {
    this.curSize = size;
    const { w, h } = this.padDims(size);
    this.padBody.setDisplaySize(w, h);
    this.rings.setDisplaySize(w, h);
    this.coverImg.setDisplaySize(w, h);

    // Cover pivots on the top edge (just under the rings). It rests folded flat
    // while the box is opened/revealed, so a resize can't un-fold it.
    this.coverHomeY = -h / 2;
    this.cover.setPosition(0, this.coverHomeY).setScale(1, this.opened || this.revealed ? 0 : 1);
    this.label.setVisible(!(this.opened || this.revealed)).setPosition(0, h * 0.46).setFontSize(Math.round(h * 0.3));

    this.setSize(w, h);
    if (this.lock) {
      const s = w * 0.5;
      this.lock.setDisplaySize(s, s * (this.lock.height / this.lock.width)).setPosition(0, h * 0.02);
    }
    this.layoutContent(w, h);
  }

  // Lays the item out on the pad in non-overlapping vertical bands that adapt to
  // whatever is present (text, one/many images, and — when answered — a tick),
  // and to dynamic content (long text / tall images shrink to fit their band).
  private layoutContent(w: number, h: number) {
    const hasWord = !!this.wordText && !!this.contentText;
    const hasImgs = this.pictures.length > 0;

    // Writable area on the pad: below the spiral rings, above the bottom edge.
    const top = -h * 0.28;
    let bottom = h * 0.42;

    // When answered-correct, reserve the bottom band for the green tick.
    if (this.revealed) {
      if (!this.tick) {
        this.tick = this.scene.add.image(0, 0, "correct-big").setOrigin(0.5);
        this.add(this.tick);
      }
      const bare = !hasWord && !hasImgs;
      const ts = w * (bare ? 0.5 : 0.3);
      const th = ts * (this.tick.height / this.tick.width);
      const tickCy = bare ? 0 : h * 0.34;
      this.tick.setVisible(true).setDisplaySize(ts, th).setPosition(0, tickCy);
      if (!bare) bottom = tickCy - th / 2 - h * 0.03;
    } else if (this.tick) {
      this.tick.setVisible(false);
    }

    const areaH = Math.max(1, bottom - top);
    const midY = (top + bottom) / 2;

    if (hasImgs && hasWord) {
      // Images band on top, text band below, separated by a gap — never overlap.
      const gap = areaH * 0.06;
      const imgH = areaH * 0.6 - gap / 2;
      const txtH = areaH * 0.4 - gap / 2;
      this.layoutImages(w * 0.82, imgH, top + imgH / 2);
      fitText(this.wordText!, w * 0.82, txtH, { max: Math.round(txtH * 0.9) });
      this.wordText!.setVisible(true).setPosition(0, bottom - txtH / 2);
    } else if (hasImgs) {
      this.layoutImages(w * 0.86, areaH * 0.94, midY);
      this.wordText?.setVisible(false);
    } else if (hasWord) {
      fitText(this.wordText!, w * 0.82, areaH * 0.92, { max: Math.round(areaH * 0.7) });
      this.wordText!.setVisible(true).setPosition(0, midY);
    }
  }

  // Lays one or many images in a centred row within (maxW × maxH) at height cy,
  // each scaled to fit its cell (aspect-preserving).
  private layoutImages(maxW: number, maxH: number, cy: number) {
    const n = this.pictures.length;
    if (n === 0) return;
    const gap = n > 1 ? maxW * 0.04 : 0;
    const cellW = (maxW - gap * (n - 1)) / n;
    const startX = -maxW / 2 + cellW / 2;
    this.pictures.forEach((img, i) => {
      fitImage(img, cellW, maxH);
      img.setVisible(true).setPosition(startX + i * (cellW + gap), cy);
    });
  }

  setHome(x: number, y: number, size: number) {
    this.homeX = x;
    this.homeY = y;
    this.homeSize = size;
    this.setPosition(x, y);
    this.applySize(size);
  }

  // Store the grid slot without moving the box — used on resize while the box is
  // out on the answer board (or slid off), so it isn't yanked back to the grid.
  setHomeSlot(x: number, y: number, size: number) {
    this.homeX = x;
    this.homeY = y;
    this.homeSize = size;
  }

  // Snap the (landed) board to a new resting spot/size on resize.
  placeOnBoard(x: number, y: number, size: number) {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1).setPosition(x, y);
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

  // Click: the cover (first page) folds up off the binding — like opening a book
  // — in place, revealing the item already printed on the pad beneath it. The
  // box does not move yet; the other boxes are flying off around it.
  openCover(): Promise<void> {
    this.opened = true;
    return new Promise((resolve) => {
      this.scene.tweens.killTweensOf(this.cover);
      this.scene.tweens.add({
        targets: this.cover,
        y: this.coverHomeY - this.curSize * 0.12,
        scaleY: 0,
        duration: 340,
        ease: "Quad.easeIn",
        onComplete: () => {
          this.label.setVisible(false);
          resolve();
        },
      });
    });
  }

  // The opened box (now a lined pad with the item showing) grows out of its grid
  // slot and glides — via a centre waypoint — to its resting spot on the answer
  // board. It stays one continuous object the whole way (no pop-in). On landing
  // the pad is re-fitted at full size so the text is crisp.
  moveToBoard(wpX: number, wpY: number, restX: number, restY: number, boardSize: number): Promise<void> {
    const s = boardSize / this.curSize;
    return new Promise((resolve) => {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        x: wpX,
        y: wpY,
        scaleX: s,
        scaleY: s,
        duration: 820,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            x: restX,
            y: restY,
            duration: 680,
            ease: "Sine.easeInOut",
            onComplete: () => {
              this.setScale(1);
              this.setPosition(restX, restY);
              this.applySize(boardSize);
              // A gentle settle as it lands.
              this.scene.tweens.add({
                targets: this,
                x: restX - Math.max(6, boardSize * 0.04),
                duration: 240,
                ease: "Sine.easeInOut",
                yoyo: true,
                onComplete: () => resolve(),
              });
            },
          });
        },
      });
    });
  }

  // Answer resolved: the SAME board glides smoothly back to its original grid
  // slot (the reverse of the outbound travel), shrinking as it goes, then settles
  // into its answered look (word + tick, or a lock).
  returnHome(): Promise<void> {
    const s = this.homeSize / this.curSize;
    return new Promise((resolve) => {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        x: this.homeX,
        y: this.homeY,
        scaleX: s,
        scaleY: s,
        duration: 620,
        ease: "Sine.easeInOut", // smooth sine travel back to its place
        onComplete: () => {
          this.setScale(1).setAngle(0);
          this.setPosition(this.homeX, this.homeY);
          this.applySize(this.homeSize);
          resolve();
        },
      });
    });
  }

  // Correct → the box stays open showing the word + a green tick. Wrong (or no
  // answer) → it re-closes and locks like the source.
  markAnswered(correct: boolean, text?: string | null) {
    if (correct) {
      this.answered = true;
      this.opened = true;
      this.revealed = true;
      if (text !== undefined) this.contentText = text ?? this.contentText;
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
    // Re-close: the cover drops back down (greyed) and locks over the item.
    this.opened = false;
    this.revealed = false;
    this.scene.tweens.killTweensOf(this.cover);
    this.coverImg.setTexture(coverKey("grey"));
    this.label.setAlpha(0.35);
    this.content.setVisible(false);
    if (!this.lock) {
      this.lock = this.scene.add.image(0, 0, THEME.lock).setOrigin(0.5);
      this.add(this.lock);
    }
    this.lock.setVisible(true);
    this.applySize(this.homeSize);
    this.disableInteractive();
  }

  // Hover: only the cover (first page) lifts off the pad, like the corner of a
  // book cover being raised. The box itself does not zoom.
  setHovered(on: boolean) {
    if (this.answered || this.opened) return;
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
