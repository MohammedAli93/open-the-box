import { FONT_FAMILY } from "@/config/text";
import { ZOrder } from "@/config/zorder";
import { type Choice } from "@/core/data";
import { fitText, fitImage, padArabic } from "@/utils/layout";
import { arabicNum } from "@/utils/arabic";
import { THEME, CRUMBLE, ANSWER_PAPERS } from "@/config/theme";

const LABELS = ["أ", "ب", "ج", "د", "هـ", "و"];

// An answer choice on a real white spiral pad: a letter label + coloured answer
// text (or image). Correct → green tick; wrong → red cross + the paper crumples.
export class ChoiceButton extends Phaser.GameObjects.Container {
  public readonly choice: Choice;
  private textColor: string;
  private pad: Phaser.GameObjects.Image;
  private rings: Phaser.GameObjects.Image;
  private letter: Phaser.GameObjects.Text;
  private label?: Phaser.GameObjects.Text;
  private picture?: Phaser.GameObjects.Image;
  private mark?: Phaser.GameObjects.Image;
  private crumbleSprite?: Phaser.GameObjects.Sprite;
  private _w = 10;
  private _h = 10;

  constructor(scene: Phaser.Scene, choice: Choice, index: number, textColor: number) {
    super(scene, 0, 0);
    this.choice = choice;
    this.textColor = "#" + (textColor >>> 0).toString(16).padStart(6, "0");

    this.pad = scene.add.image(0, 0, Phaser.Utils.Array.GetRandom(ANSWER_PAPERS)).setOrigin(0.5);
    this.rings = scene.add.image(0, 0, THEME.rings).setOrigin(0.5);
    this.letter = scene.add
      .text(0, 0, LABELS[index] ?? arabicNum(index + 1), { fontFamily: FONT_FAMILY.BOLD, color: "#9aa0ab" })
      .setOrigin(0.5)
      .setRTL(true);
    this.add([this.pad, this.rings, this.letter]);

    if (choice.type === "text") {
      this.label = scene.add
        .text(0, 0, choice.content, { fontFamily: FONT_FAMILY.BOLD, color: this.textColor, align: "center" })
        .setOrigin(0.5)
        .setRTL(true);
      this.add(this.label);
    } else {
      this.picture = scene.add.image(0, 0, choice.content).setOrigin(0.5);
      this.add(this.picture);
    }
  }

  private padDims(width: number, height: number) {
    const ratio = this.pad.height / this.pad.width; // ~1.16
    let w = width;
    let h = width * ratio;
    if (h > height) {
      h = height;
      w = height / ratio;
    }
    return { w, h };
  }

  layout(width: number, height: number) {
    const { w, h } = this.padDims(width, height);
    this._w = w;
    this._h = h;
    this.setSize(w, h);
    this.pad.setDisplaySize(w, h);
    this.rings.setDisplaySize(w, h);

    this.letter.setFontSize(h * 0.11).setPosition(0, -h * 0.28);
    padArabic(this.letter);

    const bodyW = w * 0.8;
    const bodyH = h * 0.42;
    const bodyY = h * 0.1;
    if (this.label) {
      fitText(this.label, bodyW, bodyH, { max: Math.round(h * 0.24) });
      this.label.setPosition(0, bodyY);
    }
    if (this.picture) {
      fitImage(this.picture, bodyW, bodyH);
      this.picture.setPosition(0, bodyY);
    }
    if (this.mark) {
      const ms = w * 0.34;
      this.mark.setDisplaySize(ms, ms).setPosition(w / 2 - ms * 0.55, -h / 2 + ms * 0.55);
    }
  }

  setHover(on: boolean) {
    if (this.scene) this.setAngle(this.baseAngle + (on ? 1.5 : 0));
  }

  private baseAngle = 0;
  setBaseAngle(a: number) {
    this.baseAngle = a;
    this.setAngle(a);
  }

  showAnimation(delay: number) {
    const target = this.scale;
    this.setScale(0);
    this.scene.tweens.add({ targets: this, scale: target, duration: 240, delay, ease: "Back.easeOut" });
  }

  // Drops the card in from above into its laid-out position (source-style).
  dropIn(delay: number) {
    const targetY = this.y;
    const drop = Math.max(this._h * 3, 260);
    this.setPosition(this.x, targetY - drop).setAlpha(0);
    this.scene.tweens.add({ targets: this, y: targetY, alpha: 1, duration: 300, delay, ease: "Back.easeOut" });
  }

  private showMark(key: string) {
    if (!this.mark) {
      this.mark = this.scene.add.image(0, 0, key);
      this.add(this.mark);
    } else {
      this.mark.setTexture(key);
    }
    this.mark.setVisible(true);
    // Small badge low on the card (like the source's little tick).
    const ms = this._w * 0.3;
    this.mark
      .setDisplaySize(ms, ms * (this.mark.height / this.mark.width))
      .setPosition(this._w / 2 - ms * 0.6, this._h / 2 - ms * 0.6);
  }

  // Stamp the result: a green tick if correct, the red cross if wrong.
  stamp(status: "correct" | "incorrect") {
    if (status === "correct") {
      this.showMark("correct-big");
    } else {
      this.showMark(THEME.cross);
    }
  }

  // A wrong / non-answer card fades away before the papers crumple.
  fadeOut() {
    this.scene.tweens.add({ targets: this, alpha: 0.12, duration: 320, ease: "Sine.easeOut" });
  }

  // The paper scrunches into a ball, then the card content is hidden. All cards
  // crumple together; a faded card crumples faintly (its alpha is kept).
  crumple(delay = 0): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(delay, () => {
        if (this.crumbleSprite) return resolve();
        // Size the crumpling sheet to the card's own footprint so it reads as
        // this paper crumpling (not a wide, compressed strip).
        this.crumbleSprite = this.scene.add
          .sprite(0, 0, CRUMBLE.key, 0)
          .setDisplaySize(this._w * 1.15, this._h * 1.15)
          .setDepth(ZOrder.FEEDBACK);
        this.add(this.crumbleSprite);
        this.crumbleSprite.play(CRUMBLE.anim);
        this.crumbleSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          // Hide the card content, leave the crumpled ball.
          this.label?.setVisible(false);
          this.picture?.setVisible(false);
          this.letter.setVisible(false);
          this.pad.setVisible(false);
          this.rings.setVisible(false);
          this.mark?.setVisible(false);
          resolve();
        });
      });
    });
  }
}
