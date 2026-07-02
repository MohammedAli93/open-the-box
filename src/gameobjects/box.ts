import { THEME, PAD_CYCLE, coverKey } from "@/config/theme";
import { FONT_FAMILY } from "@/config/text";
import { WORD_COLOR } from "@/config/colors";
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
  private picture?: Phaser.GameObjects.Image;
  private contentText: string | null = null;
  private contentImage: string | null = null;

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
      .text(0, 0, String(config.index + 1), { fontFamily: FONT_FAMILY.BOLD, color: "#2a2a2a" })
      .setOrigin(0.5)
      .setRTL(true);
    this.cover = scene.add.container(0, 0, [this.coverImg, this.label]);
    this.rings = scene.add.image(0, 0, THEME.rings).setOrigin(0.5);

    // Order matters: the pad, then the hidden item, then the cover (which hides
    // the item until it folds), then the spiral rings on top.
    this.add([this.padBody, this.content, this.cover, this.rings]);
    this.applySize(config.size);
  }

  // Print the item on the pad, hidden under the cover until it folds open.
  setContent(text: string | null, image?: string | null) {
    this.contentText = text ?? null;
    this.contentImage = image ?? null;

    if (this.contentText) {
      if (!this.wordText) {
        this.wordText = this.scene.add
          .text(0, 0, this.contentText, {
            fontFamily: FONT_FAMILY.BOLD,
            color: "#" + WORD_COLOR.toString(16).padStart(6, "0"),
            align: "center",
          })
          .setOrigin(0.5)
          .setRTL(true);
        this.content.add(this.wordText);
      } else {
        this.wordText.setText(this.contentText);
      }
    }
    if (this.contentImage && !this.picture) {
      this.picture = this.scene.add.image(0, 0, this.contentImage).setOrigin(0.5);
      this.content.add(this.picture);
    }
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

  // The item printed on the pad. When just opened it sits centred; once answered
  // correctly the word moves up and a green tick sits below it.
  private layoutContent(w: number, h: number) {
    const hasWord = !!this.wordText && !!this.contentText;
    const hasImg = !!this.picture && !!this.contentImage;

    if (this.revealed) {
      if (hasWord) {
        fitText(this.wordText!, w * 0.82, h * 0.46, { max: Math.round(h * 0.24) });
        this.wordText!.setVisible(true).setPosition(0, hasImg ? -h * 0.28 : -h * 0.08);
      }
      if (hasImg) {
        fitImage(this.picture!, w * 0.6, h * 0.4);
        this.picture!.setVisible(true).setPosition(0, hasWord ? -h * 0.02 : -h * 0.1);
      }
      if (!this.tick) {
        this.tick = this.scene.add.image(0, 0, "correct-big").setOrigin(0.5);
        this.add(this.tick);
      }
      const ts = w * (hasWord || hasImg ? 0.34 : 0.5);
      this.tick
        .setVisible(true)
        .setDisplaySize(ts, ts * (this.tick.height / this.tick.width))
        .setPosition(0, hasWord || hasImg ? h * 0.3 : 0);
      return;
    }

    const both = hasWord && hasImg;
    if (hasImg) {
      fitImage(this.picture!, w * 0.72, both ? h * 0.42 : h * 0.6);
      this.picture!.setVisible(true).setPosition(0, both ? -h * 0.16 : h * 0.04);
    }
    if (hasWord) {
      fitText(this.wordText!, w * 0.74, both ? h * 0.3 : h * 0.6, { max: Math.round(h * 0.5) });
      this.wordText!.setVisible(true).setPosition(0, both ? h * 0.22 : h * 0.06);
    }
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

  // Answer resolved: the board shrinks back to its grid slot, then settles into
  // its answered look (word + tick, or a lock).
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
        duration: 320,
        ease: "Back.easeIn",
        onComplete: () => {
          this.setScale(1);
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
