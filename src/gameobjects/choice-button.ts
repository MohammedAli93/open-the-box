import { FONT_FAMILY } from "@/config/text";
import { ZOrder } from "@/config/zorder";
import { type Choice } from "@/core/data";
import { fitText, fitImage } from "@/utils/layout";
import { arabicNum } from "@/utils/arabic";
import { THEME, CRUMBLE } from "@/config/theme";

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

    this.pad = scene.add.image(0, 0, THEME.pad("white")).setOrigin(0.5);
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
    const ms = this._w * 0.34;
    this.mark.setDisplaySize(ms, ms).setPosition(this._w / 2 - ms * 0.55, -this._h / 2 + ms * 0.55);
  }

  setStatus(status: "correct" | "incorrect") {
    if (status === "correct") {
      this.showMark("correct-small");
      this.pad.setTint(0xd8f3e0);
    } else {
      this.showMark(THEME.cross);
    }
  }

  dim() {
    this.setAlpha(0.5);
  }

  pulse() {
    this.scene.tweens.add({ targets: this, scale: this.scale * 1.06, duration: 480, yoyo: true, repeat: -1 });
  }

  // The paper crumples into a ball over the card.
  private crumble() {
    if (this.crumbleSprite) return;
    this.crumbleSprite = this.scene.add
      .sprite(0, 0, CRUMBLE.key, 0)
      .setDisplaySize(this._w * 1.25, this._w * 1.25 * (154 / 200))
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
    });
  }

  // Correct → tick pops; wrong → cross + crumple + shake.
  playSelected(status: "correct" | "incorrect"): Promise<void> {
    this.setStatus(status);
    if (status === "correct") {
      const big = this.scene.add
        .image(this.x, this.y, "correct-big")
        .setDepth(ZOrder.FEEDBACK)
        .setScale(0);
      return new Promise((res) => {
        this.scene.tweens.add({
          targets: big,
          scale: (Math.min(this._w, this._h) / Math.max(1, big.width)) * 1.15,
          duration: 260,
          ease: "Back.easeOut",
          yoyo: true,
          hold: 350,
          onComplete: () => {
            big.destroy();
            res();
          },
        });
      });
    }
    // incorrect
    return Promise.allSettled([this.shake(), this.delayedCrumble()]).then(() => undefined);
  }

  private delayedCrumble(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(200, () => {
        this.crumble();
        this.scene.time.delayedCall(500, () => resolve());
      });
    });
  }

  private shake(): Promise<void> {
    return new Promise((resolve) => {
      const a = this.baseAngle;
      this.setAngle(a - 5);
      this.scene.tweens.add({
        targets: this,
        angle: a + 5,
        duration: 60,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          this.setAngle(a);
          resolve();
        },
      });
    });
  }
}
