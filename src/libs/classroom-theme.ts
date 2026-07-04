// "Classroom" theme — a second design built from REAL photographic assets, not
// flat vector shapes. The backdrop is a real chalkboard photo; the boxes are
// chalkboard slates in painted-wood frames (composited from the real chalkboard +
// the real wood photo already in the repo); and the pad, answer cards, crumple,
// lock, cross and desk props all reuse the real school assets shipped with the
// notebook theme. Everything is registered under the SAME th-*/answer-paper-*
// keys the game already renders, so no game object changes.
import { PAD_CYCLE, PAD_TINT } from "@/config/theme";

type Ctx = CanvasRenderingContext2D;

const hex = (n: number) => "#" + (n & 0xffffff).toString(16).padStart(6, "0");
function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
const lighten = (c: number, t: number) => mix(c, 0xffffff, t);
const darken = (c: number, t: number) => mix(c, 0x000000, t);

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Draw a source image to cover a target rect (like CSS background-size: cover),
// with an optional pan (0..1) so different slates sample different chalk regions.
function drawCover(ctx: Ctx, img: CanvasImageSource, dx: number, dy: number, dw: number, dh: number, panX = 0.5, panY = 0.5) {
  const iw = (img as HTMLImageElement).width || dw;
  const ih = (img as HTMLImageElement).height || dh;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) * panX;
  const sy = (ih - sh) * panY;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function paint(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const ct = scene.textures.createCanvas(key, w, h);
  if (!ct) return;
  const ctx = ct.getContext();
  ctx.clearRect(0, 0, w, h);
  draw(ctx);
  ct.refresh();
}

// Build one slate cover: real chalkboard fill + a painted-wood frame (real wood
// grain tinted to the box colour) + a faint hand-drawn chalk ring for the number.
function paintSlate(scene: Phaser.Scene, color: string, base: number, chalk: CanvasImageSource, wood: CanvasImageSource, panX: number) {
  const W = 300, H = 348, m = 7, frame = 26;
  const grey = color === "grey";
  paint(scene, `th-cover-${color}`, W, H, (ctx) => {
    // Drop shadow so the slate lifts off the chalkboard backdrop.
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    roundRectPath(ctx, m + 2, m + 8, W - m * 2, H - m * 2, 22);
    ctx.fill();

    const ox = m, oy = m, ow = W - m * 2, oh = H - m * 2;

    // Slate surface: real chalkboard, panned per colour, with an inner vignette.
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, ox, oy, ow, oh, 18);
    ctx.clip();
    drawCover(ctx, chalk, ox, oy, ow, oh, panX, 0.4);
    if (grey) { ctx.fillStyle = "rgba(120,120,120,0.35)"; ctx.fillRect(ox, oy, ow, oh); }
    const vg = ctx.createRadialGradient(W / 2, H / 2, ow * 0.2, W / 2, H / 2, ow * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(ox, oy, ow, oh);
    ctx.restore();

    // Painted-wood frame: clip to the ring between outer and inner rounded rects.
    const inX = ox + frame, inY = oy + frame, inW = ow - frame * 2, inH = oh - frame * 2;
    const ftop = grey ? 0x9a9a9a : lighten(base, 0.18);
    const fbot = grey ? 0x6f6f6f : darken(base, 0.28);
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, ox, oy, ow, oh, 18);
    roundRectPath(ctx, inX, inY, inW, inH, 8);
    ctx.clip("evenodd");
    const fg = ctx.createLinearGradient(0, oy, 0, oy + oh);
    fg.addColorStop(0, hex(ftop));
    fg.addColorStop(1, hex(fbot));
    ctx.fillStyle = fg;
    ctx.fillRect(ox, oy, ow, oh);
    // Real wood grain over the paint for texture.
    ctx.globalAlpha = grey ? 0.25 : 0.4;
    ctx.globalCompositeOperation = "multiply";
    drawCover(ctx, wood, ox, oy, ow, oh, 0.5, 0.5);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();

    // Frame bevel: light top/left edge, dark inner edge (slate sits recessed).
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    roundRectPath(ctx, ox + 1.5, oy + 1.5, ow - 3, oh - 3, 17);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    roundRectPath(ctx, inX, inY, inW, inH, 8);
    ctx.stroke();

    // Faint chalk circle around where the number is printed (box draws it white).
    if (!grey) {
      ctx.strokeStyle = "rgba(240,240,235,0.28)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(W / 2, H * 0.46, ow * 0.24, ow * 0.24 * 1.05, 0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

// Composite the slate covers once the real chalkboard + wood photos have loaded.
function buildClassroomCovers(scene: Phaser.Scene) {
  const chalk = scene.textures.get("th-wood").getSourceImage() as CanvasImageSource;
  const wood = scene.textures.get("cl-wood-src").getSourceImage() as CanvasImageSource;
  const pans: Record<string, number> = { blue: 0.2, red: 0.5, green: 0.8, grey: 0.35 };
  [...PAD_CYCLE, "grey"].forEach((c) => paintSlate(scene, c, PAD_TINT[c] ?? 0x9a9a9a, chalk, wood, pans[c] ?? 0.5));

  // No spiral binding on slates/cards — keep th-rings empty (transparent).
  paint(scene, "th-rings", 4, 4, () => {});
}

// Queue the classroom asset loads and schedule the slate compositing. Reuses the
// real school assets already in the repo; only the chalkboard backdrop is new.
export function loadClassroomTheme(scene: Phaser.Scene) {
  // New real asset: the chalkboard backdrop (also the slate surface source).
  scene.load.setPath("assets/classroom");
  scene.load.image("th-wood", "chalkboard.webp");

  // Reuse the real photographic school assets shipped with the notebook theme.
  scene.load.setPath("assets/theme");
  scene.load.image("cl-wood-src", "wood.webp"); // wood grain for the slate frames
  scene.load.image("th-pad-white", "pad-white.webp"); // real lined pad (revealed content)
  scene.load.image("th-lock", "lock.webp");
  scene.load.image("th-cross", "cross.png");
  scene.load.spritesheet("th-crumble", "crumble.webp", { frameWidth: 200, frameHeight: 154 });
  ["deco-pencil", "deco-pencil2", "deco-pen", "deco-rubber", "deco-sheet"].forEach((d) =>
    scene.load.image(`th-${d}`, `${d}.webp`)
  );
  scene.load.image("th-deco-headphone", "deco-headphone.webp");

  // Real paper answer-card faces.
  scene.load.setPath("new");
  scene.load.image("answer-paper-a", "squaretilefacefront2.2omlhykjxvfoqykwnjknhaq2.png");
  scene.load.image("answer-paper-b", "squaretilefacefront3.2u7ckjjvlm11jno7hutjcfw2.png");
  scene.load.setPath();

  // Once the chalkboard + wood are in, composite the slate covers (synchronous),
  // before the loader COMPLETE handler in Loading fades on to the Grid.
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => buildClassroomCovers(scene));
}
