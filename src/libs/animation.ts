import { AudioManager } from "@/libs/audio";

// A reusable, scene-scoped animation system for the game — one instance per
// scene (`this.anim = new AnimationManager(this)`). Every helper is built on
// Phaser tweens/particles and is configurable through an options object so we
// never duplicate tween code across scenes.
//
// Design notes:
//  • Particle textures are generated once per game (guarded by texture keys) so
//    the manager has no asset dependencies.
//  • Emitters are one-shot: they stop emitting and destroy themselves once their
//    particles have died, so nothing leaks.
//  • Sound is synchronised by passing an `sfx` key to the visual helper, keeping
//    audio and animation in a single call site.

// Structural type satisfied by Image/Text/Graphics/Container — everything we
// animate. Kept loose on purpose so any display object can be passed in.
type GO = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  alpha: number;
  scaleX: number;
  scaleY: number;
  depth: number;
  setAlpha(value?: number): unknown;
  setScale(x?: number, y?: number): unknown;
};

export interface TweenOpts {
  duration?: number;
  delay?: number;
  ease?: string;
  onComplete?: () => void;
  sfx?: string;
}

// Texture keys for the generated particle art.
const TEX = {
  star: "fx-star",
  spark: "fx-spark",
  confetti: "fx-confetti",
};

const CONFETTI_COLORS = [0x2aa6de, 0xe23f7e, 0x2fa85f, 0xf2c14e, 0x9b5de5, 0xff8c42];

export class AnimationManager {
  constructor(private scene: Phaser.Scene) {
    AnimationManager.ensureTextures(scene);
  }

  private play(key?: string) {
    if (key) AudioManager.playSFX(this.scene.sound, key);
  }

  // ── Generated particle textures ──────────────────────────────────────────
  private static ensureTextures(scene: Phaser.Scene) {
    const tex = scene.textures;
    if (!tex.exists(TEX.spark)) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillCircle(16, 16, 16);
      g.generateTexture(TEX.spark, 32, 32);
      g.destroy();
    }
    if (!tex.exists(TEX.star)) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      AnimationManager.drawStar(g, 24, 24, 5, 22, 10, 0xffffff);
      g.generateTexture(TEX.star, 48, 48);
      g.destroy();
    }
    if (!tex.exists(TEX.confetti)) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 14, 22);
      g.generateTexture(TEX.confetti, 14, 22);
      g.destroy();
    }
  }

  private static drawStar(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    points: number,
    outer: number,
    inner: number,
    color: number
  ) {
    g.fillStyle(color, 1);
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / points) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
  }

  // ── 1. Screen intro: staggered fade + slide + Back.Out ───────────────────
  screenIntro(targets: GO[], opts: TweenOpts & { slide?: number; stagger?: number } = {}) {
    const { duration = 460, ease = "Back.easeOut", slide = 40, stagger = 90, onComplete } = opts;
    targets.forEach((t, i) => {
      const finalY = t.y;
      t.setAlpha(0);
      (t as unknown as Phaser.GameObjects.Components.Transform).y = finalY + slide;
      this.scene.tweens.add({
        targets: t,
        y: finalY,
        alpha: 1,
        duration,
        ease,
        delay: i * stagger,
        onComplete: i === targets.length - 1 ? onComplete : undefined,
      });
    });
  }

  // ── 2. Box idle: breathing + subtle float, endless loop ──────────────────
  idle(target: GO, opts: { scale?: number; float?: number; duration?: number } = {}) {
    const { scale = 0.04, float = 6, duration = 1600 } = opts;
    const t = target as unknown as { scaleX: number; scaleY: number; y: number };
    const baseScale = t.scaleX || 1;
    const baseY = t.y;
    const breathe = this.scene.tweens.add({
      targets: target,
      scaleX: baseScale * (1 + scale),
      scaleY: baseScale * (1 + scale),
      duration,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
    const drift = this.scene.tweens.add({
      targets: target,
      y: baseY - float,
      duration: duration * 1.3,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      breathe.stop();
      drift.stop();
    };
  }

  // ── 3. Button press: squash → stretch → overshoot, sound-synced ──────────
  playButtonPress(button: GO, opts: TweenOpts = {}): Promise<void> {
    const { duration = 90, ease = "Quad.easeOut", sfx = "sfx-open", onComplete } = opts;
    this.play(sfx);
    const b = button as unknown as { scaleX: number; scaleY: number };
    const sx = b.scaleX || 1;
    const sy = b.scaleY || 1;
    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: button,
        tweens: [
          { scaleX: sx * 0.88, scaleY: sy * 1.12, duration, ease },
          { scaleX: sx * 1.08, scaleY: sy * 0.92, duration, ease },
          { scaleX: sx, scaleY: sy, duration: duration * 2, ease: "Back.easeOut" },
        ],
        onComplete: () => {
          onComplete?.();
          resolve();
        },
      });
    });
  }

  // ── 4. Box reveal: press → fake-3D flip (scaleX) → glow + sparkles ───────
  playBoxReveal(box: GO, opts: TweenOpts & { onMidFlip?: () => void } = {}): Promise<void> {
    const { duration = 180, ease = "Quad.easeInOut", sfx = "sfx-open", onMidFlip, onComplete } = opts;
    this.play(sfx);
    const b = box as unknown as { scaleX: number; scaleY: number; x: number; y: number };
    const sx = b.scaleX || 1;
    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: box,
        tweens: [
          { scaleY: (b.scaleY || 1) * 0.94, duration: 80, ease: "Quad.easeOut", yoyo: true },
          {
            scaleX: 0,
            duration,
            ease,
            onComplete: () => onMidFlip?.(),
          },
          { scaleX: sx, duration, ease },
        ],
        onComplete: () => {
          this.playSparkles(b.x, b.y);
          this.pulseGlow(box);
          onComplete?.();
          resolve();
        },
      });
    });
  }

  // A soft glow pulse (alpha-tinted clone behind the object).
  pulseGlow(target: GO, opts: { color?: number; scale?: number; duration?: number } = {}) {
    const t = target as unknown as { x: number; y: number };
    const { scale = 1.6, duration = 520 } = opts;
    const glow = this.scene.add
      .image(t.x, t.y, TEX.spark)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xfff2a8)
      .setScale(0.2)
      .setDepth((target as unknown as { depth: number }).depth ?? 0);
    this.scene.tweens.add({
      targets: glow,
      scale,
      alpha: { from: 0.8, to: 0 },
      duration,
      ease: "Sine.easeOut",
      onComplete: () => glow.destroy(),
    });
  }

  // ── 5. Correct: scale punch + green flash + star burst + score sync ──────
  playCorrect(target: GO, opts: TweenOpts = {}): Promise<void> {
    const { sfx = "sfx-correct", onComplete } = opts;
    this.play(sfx);
    const t = target as unknown as { x: number; y: number };
    this.flash(0x2fa85f, 0.35);
    this.starBurst(t.x, t.y);
    return this.punch(target, { onComplete });
  }

  // ── 6. Wrong: squash + shake + wobble + camera shake + red flash ─────────
  playWrong(target: GO, opts: TweenOpts = {}): Promise<void> {
    const { sfx = "sfx-wrong", onComplete } = opts;
    this.play(sfx);
    this.flash(0xc0392b, 0.35);
    this.scene.cameras.main.shake(220, 0.006);
    const b = target as unknown as { scaleX: number; scaleY: number; angle: number };
    const sx = b.scaleX || 1;
    const sy = b.scaleY || 1;
    const baseAngle = b.angle || 0;
    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: target,
        tweens: [
          { scaleX: sx * 1.1, scaleY: sy * 0.9, duration: 90, ease: "Quad.easeOut" },
          { x: "-=10", angle: baseAngle - 5, duration: 55, ease: "Sine.easeInOut" },
          { x: "+=20", angle: baseAngle + 5, duration: 55, ease: "Sine.easeInOut", yoyo: true, repeat: 1 },
          { x: "-=10", scaleX: sx, scaleY: sy, angle: baseAngle, duration: 80, ease: "Quad.easeOut" },
        ],
        onComplete: () => {
          onComplete?.();
          resolve();
        },
      });
    });
  }

  // ── 7. Win: confetti + star burst (popup done by caller) ─────────────────
  // NOTE: no camera zoom here — zooming the main camera crops the view and can
  // read as "not full screen". Celebrate with particles instead.
  playWin(opts: { center?: { x: number; y: number }; sfx?: string } = {}) {
    const cam = this.scene.cameras.main;
    const cx = opts.center?.x ?? cam.width / 2;
    const cy = opts.center?.y ?? cam.height / 2;
    this.play(opts.sfx ?? "sfx-complete");
    this.playConfetti(cx, cy);
    this.scene.time.delayedCall(250, () => this.starBurst(cx, cy, 26));
  }

  // ── 8. Lose: camera shake + red flash (popup bounce done by caller) ──────
  playLose(opts: { sfx?: string } = {}) {
    this.play(opts.sfx ?? "sfx-wrong");
    this.scene.cameras.main.shake(300, 0.008);
    this.flash(0xc0392b, 0.3);
  }

  // ── 9. Popup system: Back.Out entrance, fade exit ────────────────────────
  showPopup(container: GO, opts: TweenOpts = {}): Promise<void> {
    const { duration = 420, ease = "Back.easeOut", sfx, onComplete } = opts;
    this.play(sfx);
    const c = container as unknown as { setScale: (n: number) => void };
    c.setScale(0);
    container.setAlpha(1);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: container,
        scale: 1,
        duration,
        ease,
        onComplete: () => {
          onComplete?.();
          resolve();
        },
      });
    });
  }

  hidePopup(container: GO, opts: TweenOpts = {}): Promise<void> {
    const { duration = 240, ease = "Sine.easeIn", sfx, onComplete } = opts;
    this.play(sfx);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: container,
        scale: 0.6,
        alpha: 0,
        duration,
        ease,
        onComplete: () => {
          onComplete?.();
          resolve();
        },
      });
    });
  }

  // Reveal a row/column of elements one after another (e.g. popup buttons).
  sequentialAppear(targets: GO[], opts: TweenOpts & { stagger?: number; scale?: number } = {}) {
    const { duration = 320, ease = "Back.easeOut", stagger = 130 } = opts;
    targets.forEach((t, i) => {
      const target = t as unknown as { setScale: (n: number) => void };
      target.setScale(0);
      t.setAlpha(1);
      this.scene.tweens.add({ targets: t, scale: 1, duration, ease, delay: i * stagger });
    });
  }

  // ── 10. Text animations ──────────────────────────────────────────────────
  // Animate a number counting up, with a little bounce as it lands.
  countUp(
    text: Phaser.GameObjects.Text,
    to: number,
    opts: { from?: number; duration?: number; format?: (n: number) => string } = {}
  ) {
    const { from = 0, duration = 900, format = (n) => String(n) } = opts;
    const state = { v: from };
    this.scene.tweens.add({
      targets: state,
      v: to,
      duration,
      ease: "Cubic.easeOut",
      onUpdate: () => text.setText(format(Math.round(state.v))),
      onComplete: () => {
        text.setText(format(to));
        this.playTextBounce(text);
      },
    });
  }

  playTextBounce(text: GO, opts: { scale?: number; duration?: number } = {}) {
    const { scale = 1.25, duration = 180 } = opts;
    const t = text as unknown as { scaleX: number };
    const base = t.scaleX || 1;
    this.scene.tweens.add({
      targets: text,
      scale: base * scale,
      duration,
      ease: "Quad.easeOut",
      yoyo: true,
    });
  }

  // ── 11. Particle system: reusable one-shot emitters ──────────────────────
  private burst(
    x: number,
    y: number,
    texture: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    lifespanMs: number
  ) {
    const emitter = this.scene.add
      .particles(x, y, texture, config)
      .setDepth(ZTOP);
    // One-shot: stop feeding, then destroy once every particle has died.
    this.scene.time.delayedCall(lifespanMs + 120, () => emitter.destroy());
    return emitter;
  }

  playSparkles(x: number, y: number, count = 12) {
    this.burst(
      x,
      y,
      TEX.spark,
      {
        lifespan: 600,
        speed: { min: 40, max: 160 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffffff, 0xfff2a8, 0xffe066],
        blendMode: "ADD",
        emitting: false,
      },
      700
    ).explode(count, 0, 0);
  }

  starBurst(x: number, y: number, count = 18) {
    this.burst(
      x,
      y,
      TEX.star,
      {
        lifespan: 850,
        speed: { min: 120, max: 320 },
        scale: { start: 0.7, end: 0 },
        rotate: { start: 0, end: 360 },
        alpha: { start: 1, end: 0 },
        gravityY: 300,
        tint: [0xffd93d, 0xffe873, 0xfff2a8],
        emitting: false,
      },
      900
    ).explode(count, 0, 0);
  }

  playConfetti(x: number, y: number, count = 90) {
    this.burst(
      x,
      y,
      TEX.confetti,
      {
        x: { min: -x, max: x }, // rain across the width, centred on x
        lifespan: 2200,
        speedY: { min: 200, max: 460 },
        speedX: { min: -120, max: 120 },
        scale: { min: 0.6, max: 1.1 },
        rotate: { start: 0, end: 360 },
        alpha: { start: 1, end: 0.9 },
        gravityY: 420,
        tint: CONFETTI_COLORS,
        emitting: false,
      },
      2400
    ).explode(count, 0, -y * 0.5);
  }

  // ── 12. Camera effects ───────────────────────────────────────────────────
  flash(color = 0xffffff, intensity = 0.4, duration = 260) {
    const [r, g, b] = [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
    this.scene.cameras.main.flash(duration, r, g, b, false, undefined, undefined);
    // Phaser's flash is white-scaled; the colour args tint it.
    void intensity;
  }

  shake(duration = 220, intensity = 0.006) {
    this.scene.cameras.main.shake(duration, intensity);
  }

  zoom(to = 1.06, duration = 400, ease = "Sine.easeInOut") {
    this.scene.cameras.main.zoomTo(to, duration, ease);
  }

  // ── Shared: a quick scale "punch" used by several effects ────────────────
  punch(target: GO, opts: TweenOpts & { scale?: number } = {}): Promise<void> {
    const { scale = 1.18, duration = 130, ease = "Quad.easeOut", onComplete } = opts;
    const t = target as unknown as { scaleX: number };
    const base = t.scaleX || 1;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: target,
        scale: base * scale,
        duration,
        ease,
        yoyo: true,
        onComplete: () => {
          onComplete?.();
          resolve();
        },
      });
    });
  }
}

// Particle effects should sit above everything else in the scene.
const ZTOP = 100000;
