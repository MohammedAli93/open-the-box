// "Candy" theme — a second visual design generated entirely in code (no art
// files). Every texture is drawn onto a canvas and registered under the SAME
// texture keys the game already renders (th-*, answer-paper-*), so box.ts,
// choice-button.ts, quiz-board.ts, Grid and Complete need zero changes: with
// `"theme": "candy"` in data.json (or ?theme=candy) they simply get candy art.
//
// Reference feel: bright pastel sweet-shop — glossy gumdrops, wrapper crimps,
// lollipops and sprinkles. Motion is untouched; only the pixels change.
import { PAD_CYCLE, PAD_TINT } from "@/config/theme";

type Ctx = CanvasRenderingContext2D;

// ---------- small colour helpers (work on 0xRRGGBB numbers) ----------
const hex = (n: number) => "#" + (n & 0xffffff).toString(16).padStart(6, "0");
function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
const lighten = (c: number, t: number) => mix(c, 0xffffff, t);
const darken = (c: number, t: number) => mix(c, 0x000000, t);

// Deterministic PRNG so scattered sprinkles look the same every load.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Create a CanvasTexture and hand its 2D context to `draw`.
function paint(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx, w: number, h: number) => void
): Phaser.Textures.CanvasTexture | null {
  const ct = scene.textures.createCanvas(key, w, h);
  if (!ct) return null;
  const ctx = ct.getContext();
  ctx.clearRect(0, 0, w, h);
  draw(ctx, w, h);
  ct.refresh();
  return ct;
}

// The candy sprinkle palette used across props/backdrop.
const SPRINKLES = [0xff7ab6, 0x7ad0ff, 0xffd166, 0x8ce99a, 0xb197fc, 0xff9f68];

// ---------- individual textures ----------

function paintBackground(scene: Phaser.Scene) {
  paint(scene, "th-wood", 1024, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w * 0.35, h);
    g.addColorStop(0, hex(0xffe9f3)); // soft pink
    g.addColorStop(0.5, hex(0xfdeafc)); // blush
    g.addColorStop(1, hex(0xe9ecff)); // lavender
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Big, faint blushes of colour for depth.
    const blush = (cx: number, cy: number, r: number, c: number) => {
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, "rgba(" + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") + ",0.28)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    };
    blush(w * 0.2, h * 0.18, w * 0.4, 0xffc2e0);
    blush(w * 0.85, h * 0.75, w * 0.45, 0xbfe0ff);

    // Scattered polka dots + sprinkles.
    const r = rng(20240704);
    for (let i = 0; i < 120; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 4 + r() * 12;
      ctx.globalAlpha = 0.10 + r() * 0.14;
      ctx.fillStyle = hex(r() < 0.5 ? 0xffffff : SPRINKLES[(r() * SPRINKLES.length) | 0]!);
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    // A few little capsule sprinkles.
    for (let i = 0; i < 40; i++) {
      const x = r() * w;
      const y = r() * h;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = hex(SPRINKLES[(r() * SPRINKLES.length) | 0]!);
      roundRect(ctx, -10, -3.5, 20, 7, 3.5);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  });
}

// A clean glossy candy card (used for the revealed pad and the answer papers).
function paintCard(scene: Phaser.Scene, key: string, base: number, border: number) {
  paint(scene, key, 300, 348, (ctx, w, h) => {
    const pad = 8;
    // Soft drop shadow.
    ctx.fillStyle = "rgba(120,90,120,0.18)";
    roundRect(ctx, pad, pad + 8, w - pad * 2, h - pad * 2, 34);
    ctx.fill();

    // Body gradient (white → base tint).
    const g = ctx.createLinearGradient(0, pad, 0, h - pad);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, hex(base));
    ctx.fillStyle = g;
    roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 32);
    ctx.fill();

    // Candy border.
    ctx.lineWidth = 6;
    ctx.strokeStyle = hex(border);
    roundRect(ctx, pad + 3, pad + 3, w - pad * 2 - 6, h - pad * 2 - 6, 29);
    ctx.stroke();

    // Top gloss sweep.
    ctx.save();
    roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 32);
    ctx.clip();
    const gl = ctx.createLinearGradient(0, pad, 0, h * 0.42);
    gl.addColorStop(0, "rgba(255,255,255,0.9)");
    gl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(pad, pad, w - pad * 2, h * 0.4);
    ctx.restore();

    // A couple of corner sprinkles, kept out of the centre for legibility.
    const dots: [number, number, number][] = [
      [w * 0.2, h * 0.16, 6], [w * 0.8, h * 0.14, 5], [w * 0.86, h * 0.86, 6], [w * 0.16, h * 0.85, 5],
    ];
    dots.forEach(([x, y, rad], i) => {
      ctx.fillStyle = hex(SPRINKLES[i % SPRINKLES.length]!);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  });
}

// A glossy gumdrop "wrapper" cover in a colour, with a white medallion where the
// box number is printed (drawn dark by box.ts, so it needs a light backing).
function paintCover(scene: Phaser.Scene, color: string, base: number) {
  paint(scene, `th-cover-${color}`, 300, 348, (ctx, w, h) => {
    const pad = 8;
    const top = lighten(base, 0.42);
    const bot = darken(base, 0.14);

    ctx.fillStyle = "rgba(80,50,80,0.22)";
    roundRect(ctx, pad, pad + 8, w - pad * 2, h - pad * 2, 34);
    ctx.fill();

    const g = ctx.createLinearGradient(0, pad, 0, h - pad);
    g.addColorStop(0, hex(top));
    g.addColorStop(0.5, hex(base));
    g.addColorStop(1, hex(bot));
    ctx.fillStyle = g;
    roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 32);
    ctx.fill();

    // Glossy highlight across the upper body.
    ctx.save();
    roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 32);
    ctx.clip();
    const gl = ctx.createLinearGradient(0, pad, 0, h * 0.5);
    gl.addColorStop(0, "rgba(255,255,255,0.55)");
    gl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(pad, pad, w - pad * 2, h * 0.5);
    // A soft diagonal candy stripe.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(-0.5);
    ctx.fillRect(-w, -22, w * 2, 44);
    ctx.restore();

    // Outline.
    ctx.lineWidth = 5;
    ctx.strokeStyle = hex(darken(base, 0.22));
    roundRect(ctx, pad + 2.5, pad + 2.5, w - pad * 2 - 5, h - pad * 2 - 5, 30);
    ctx.stroke();

    // White medallion for the number (centre of the pad).
    const mr = w * 0.27;
    ctx.fillStyle = "rgba(60,40,60,0.18)";
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.46 + 4, mr, 0, Math.PI * 2);
    ctx.fill();
    const mg = ctx.createLinearGradient(0, h * 0.46 - mr, 0, h * 0.46 + mr);
    mg.addColorStop(0, "#ffffff");
    mg.addColorStop(1, hex(lighten(base, 0.82)));
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.46, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = hex(lighten(base, 0.3));
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.46, mr, 0, Math.PI * 2);
    ctx.stroke();
  });
}

// The top "wrapper crimp" that overlays every pad/cover (analogue of the notebook
// spiral binding). Only the top band has content; the rest is transparent.
function paintRings(scene: Phaser.Scene) {
  paint(scene, "th-rings", 300, 348, (ctx, w) => {
    const bandH = 30;
    const y = 10;
    // Rounded crimp bar.
    const g = ctx.createLinearGradient(0, y, 0, y + bandH);
    g.addColorStop(0, hex(0xffb3d1));
    g.addColorStop(1, hex(0xff77a9));
    ctx.fillStyle = g;
    roundRect(ctx, w * 0.08, y, w * 0.84, bandH, bandH / 2);
    ctx.fill();
    // Scalloped underside (little candy nubs hanging from the bar).
    const n = 7;
    const step = (w * 0.84) / n;
    for (let i = 0; i < n; i++) {
      const cx = w * 0.08 + step * (i + 0.5);
      ctx.fillStyle = hex(0xff77a9);
      ctx.beginPath();
      ctx.arc(cx, y + bandH, step * 0.42, 0, Math.PI);
      ctx.fill();
    }
    // Sugar-pearl highlights along the bar.
    for (let i = 0; i < n; i++) {
      const cx = w * 0.08 + step * (i + 0.5);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(cx, y + bandH * 0.42, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function paintLock(scene: Phaser.Scene) {
  paint(scene, "th-lock", 200, 200, (ctx, w, h) => {
    const cx = w / 2;
    const bodyY = h * 0.5;
    const bodyW = w * 0.52;
    const bodyH = h * 0.42;
    // Shackle.
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.strokeStyle = hex(0xc98bb6);
    ctx.beginPath();
    ctx.arc(cx, bodyY, bodyW * 0.34, Math.PI, 0);
    ctx.stroke();
    // Body.
    const g = ctx.createLinearGradient(0, bodyY - bodyH / 2, 0, bodyY + bodyH / 2);
    g.addColorStop(0, hex(0xff9ecb));
    g.addColorStop(1, hex(0xe06aa0));
    ctx.fillStyle = g;
    roundRect(ctx, cx - bodyW / 2, bodyY - bodyH * 0.1, bodyW, bodyH, 16);
    ctx.fill();
    // Gloss.
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    roundRect(ctx, cx - bodyW / 2 + 8, bodyY - bodyH * 0.05, bodyW - 16, bodyH * 0.32, 10);
    ctx.fill();
    // Keyhole.
    ctx.fillStyle = hex(0x8a3d69);
    ctx.beginPath();
    ctx.arc(cx, bodyY + bodyH * 0.28, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 5, bodyY + bodyH * 0.28, 10, bodyH * 0.28);
  });
}

function paintCross(scene: Phaser.Scene) {
  paint(scene, "th-cross", 160, 160, (ctx, w, h) => {
    ctx.lineCap = "round";
    ctx.lineWidth = 30;
    const draw = (color: string, off: number, lw: number) => {
      ctx.lineWidth = lw;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(w * 0.28 + off, h * 0.28 + off);
      ctx.lineTo(w * 0.72 + off, h * 0.72 + off);
      ctx.moveTo(w * 0.72 + off, h * 0.28 + off);
      ctx.lineTo(w * 0.28 + off, h * 0.72 + off);
      ctx.stroke();
    };
    draw("rgba(150,30,70,0.25)", 3, 34); // soft shadow
    draw(hex(0xff5d8f), 0, 30); // candy red-pink
    // Gloss streak.
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.26);
    ctx.lineTo(w * 0.7, h * 0.66);
    ctx.stroke();
  });
}

// 6-frame "sugar poof": the paper shrinks into a candy swirl while a ring of
// sprinkles bursts outward and fades. Registered as a spritesheet under th-crumble.
function paintCrumble(scene: Phaser.Scene) {
  const fw = 200;
  const fh = 154;
  const frames = 6;
  const ct = paint(scene, "th-crumble", fw * frames, fh, (ctx) => {
    for (let f = 0; f < frames; f++) {
      const p = f / (frames - 1);
      const ox = f * fw + fw / 2;
      const oy = fh / 2;
      // Shrinking gumdrop core.
      const coreR = 54 * (1 - p) + 6;
      if (coreR > 7) {
        const g = ctx.createRadialGradient(ox, oy - coreR * 0.3, coreR * 0.2, ox, oy, coreR);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(1, "rgba(255,140,190," + (0.9 * (1 - p) + 0.1).toFixed(2) + ")");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, coreR, 0, Math.PI * 2);
        ctx.fill();
      }
      // Burst ring of sprinkles.
      const count = 9;
      const ringR = 12 + p * 72;
      const rand = rng(1000 + f);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + f * 0.5;
        const rr = ringR * (0.7 + rand() * 0.6);
        const x = ox + Math.cos(a) * rr;
        const y = oy + Math.sin(a) * rr * 0.8;
        ctx.globalAlpha = Math.max(0, 1 - p) * 0.9;
        ctx.fillStyle = hex(SPRINKLES[i % SPRINKLES.length]!);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        roundRect(ctx, -6, -2.6, 12, 5.2, 2.6);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  });
  // Slice the strip into 6 numbered frames for generateFrameNumbers().
  if (ct) {
    for (let f = 0; f < frames; f++) ct.add(f, 0, f * fw, 0, fw, fh);
  }
}

// ---------- candy props (corner decorations) ----------

function paintLollipop(scene: Phaser.Scene, key: string, c1: number, c2: number) {
  paint(scene, key, 256, 256, (ctx, w) => {
    const cx = w * 0.5;
    const cy = w * 0.38;
    const R = w * 0.3;
    // Stick.
    ctx.fillStyle = "#f7f2ea";
    roundRect(ctx, cx - 8, cy, 16, w * 0.5, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Round candy.
    ctx.fillStyle = hex(c1);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    // Spiral.
    ctx.strokeStyle = hex(c2);
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 6; t += 0.15) {
      const rr = (R - 6) * (t / (Math.PI * 6));
      const x = cx + Math.cos(t) * rr;
      const y = cy + Math.sin(t) * rr;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Gloss.
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx - R * 0.35, cy - R * 0.4, R * 0.28, R * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function paintPeppermintStick(scene: Phaser.Scene, key: string) {
  paint(scene, key, 256, 256, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(-0.5);
    const bw = w * 0.24;
    const bh = h * 0.72;
    ctx.save();
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bw / 2);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-bw, -bh, bw * 2, bh * 2);
    // Diagonal red stripes.
    ctx.fillStyle = hex(0xff5d7a);
    for (let y = -bh; y < bh; y += 34) {
      ctx.save();
      ctx.translate(0, y);
      ctx.rotate(0.6);
      ctx.fillRect(-bw, 0, bw * 2, 16);
      ctx.restore();
    }
    ctx.restore();
    // Outline + gloss.
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bw / 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    roundRect(ctx, -bw / 2 + 4, -bh / 2 + 6, bw * 0.3, bh - 12, 6);
    ctx.fill();
    ctx.restore();
  });
}

function paintGumdrop(scene: Phaser.Scene, key: string, base: number) {
  paint(scene, key, 256, 256, (ctx, w, h) => {
    const cx = w * 0.5;
    const baseY = h * 0.74;
    const R = w * 0.32;
    const g = ctx.createLinearGradient(0, baseY - R * 1.6, 0, baseY);
    g.addColorStop(0, hex(lighten(base, 0.35)));
    g.addColorStop(1, hex(darken(base, 0.08)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - R, baseY);
    ctx.quadraticCurveTo(cx - R, baseY - R * 2.1, cx, baseY - R * 2.1);
    ctx.quadraticCurveTo(cx + R, baseY - R * 2.1, cx + R, baseY);
    ctx.closePath();
    ctx.fill();
    // Sugar granules.
    const r = rng(77);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 60; i++) {
      const a = r() * Math.PI * 2;
      const rr = r() * R;
      const x = cx + Math.cos(a) * rr;
      const y = baseY - R - Math.sin(a) * rr * 0.9;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Gloss.
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx - R * 0.35, baseY - R * 1.3, R * 0.24, R * 0.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function paintWrappedCandy(scene: Phaser.Scene, key: string, base: number) {
  paint(scene, key, 256, 256, (ctx, w, h) => {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const bw = w * 0.34;
    const bh = h * 0.3;
    // Twisted wrapper ends (triangles).
    ctx.fillStyle = hex(lighten(base, 0.25));
    const end = (dir: number) => {
      ctx.beginPath();
      ctx.moveTo(cx + dir * bw, cy);
      ctx.lineTo(cx + dir * (bw + w * 0.16), cy - bh * 0.7);
      ctx.lineTo(cx + dir * (bw + w * 0.16), cy + bh * 0.7);
      ctx.closePath();
      ctx.fill();
    };
    end(1);
    end(-1);
    // Candy body.
    const g = ctx.createLinearGradient(0, cy - bh, 0, cy + bh);
    g.addColorStop(0, hex(lighten(base, 0.3)));
    g.addColorStop(1, hex(darken(base, 0.05)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gloss + swirl.
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx - bw * 0.25, cy - bh * 0.35, bw * 0.4, bh * 0.28, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, bw * 0.45, 0.6, Math.PI * 1.6);
    ctx.stroke();
  });
}

function paintDonut(scene: Phaser.Scene, key: string) {
  paint(scene, key, 320, 320, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = w * 0.36;
    const r = w * 0.15;
    // Dough ring.
    ctx.fillStyle = hex(0xd9a066);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    // Pink glaze (slightly smaller, blobby edge).
    ctx.fillStyle = hex(0xff8fc4);
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const wob = R - 6 + Math.sin(a * 7) * 6;
      const x = cx + Math.cos(a) * wob;
      const y = cy + Math.sin(a) * wob;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // Hole.
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Sprinkles.
    const rand = rng(303);
    for (let i = 0; i < 40; i++) {
      const a = rand() * Math.PI * 2;
      const rr = r + 8 + rand() * (R - r - 16);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      ctx.fillStyle = hex(SPRINKLES[(rand() * SPRINKLES.length) | 0]!);
      roundRect(ctx, -7, -2.6, 14, 5.2, 2.6);
      ctx.fill();
      ctx.restore();
    }
    // Gloss.
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx - R * 0.35, cy - R * 0.4, R * 0.3, R * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------- entry point ----------

// Generates the whole candy design. Idempotent — if it already ran (textures
// present) it does nothing, so scene restarts are safe.
export function generateCandyTheme(scene: Phaser.Scene): void {
  if (scene.textures.exists("th-wood")) return;

  paintBackground(scene);
  paintRings(scene);
  paintLock(scene);
  paintCross(scene);
  paintCrumble(scene);

  // Revealed pad + all four pad colours (box only uses white; the rest guard
  // against any stray reference).
  paintCard(scene, "th-pad-white", 0xfff4fb, 0xf7b8d6);
  ["blue", "green", "red"].forEach((c) =>
    paintCard(scene, `th-pad-${c}`, lighten(PAD_TINT[c]!, 0.86), lighten(PAD_TINT[c]!, 0.4))
  );

  // Coloured gumdrop covers (blue/red/green cycle + grey for the locked state).
  [...PAD_CYCLE, "grey"].forEach((c) => paintCover(scene, c, PAD_TINT[c] ?? 0x9a9a9a));

  // Answer-choice card faces: mint (a) and peach (b).
  paintCard(scene, "answer-paper-a", 0xecfbf2, 0xa7e8c8);
  paintCard(scene, "answer-paper-b", 0xfff2e8, 0xffc79f);

  // Corner props (mapped onto the existing deco keys).
  paintLollipop(scene, "th-deco-pencil", 0xff7ab6, 0xffffff);
  paintPeppermintStick(scene, "th-deco-pencil2");
  paintLollipop(scene, "th-deco-pen", 0x7ad0ff, 0xffffff);
  paintGumdrop(scene, "th-deco-rubber", 0x8ce99a);
  paintWrappedCandy(scene, "th-deco-sheet", 0xffd166);
  paintDonut(scene, "th-deco-headphone");
}
