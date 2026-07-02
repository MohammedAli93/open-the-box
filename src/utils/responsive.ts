// Render at CSS resolution (DPR = 1). On a HiDPI / scaled display (e.g. Windows
// 125% → devicePixelRatio 1.25) the old device-pixel canvas was 1.25× larger
// than Phaser's cameras, so ~20% rendered black (windowed) and fullscreen
// mismatched too. Sizing 1:1 with CSS pixels keeps the canvas and cameras equal,
// so it fills the window AND fullscreen. Slightly softer on HiDPI, but correct.
export const DPR = 1;

// Sizes the canvas to the window and returns the [width, height] to lay out
// against. Every scene's cameras are forced to the same size so the whole canvas
// is always covered — no black margins windowed, and it fills in fullscreen too.
export function fitScreen(scale: Phaser.Scale.ScaleManager) {
  const w = Math.max(1, Math.round(window.innerWidth));
  const h = Math.max(1, Math.round(window.innerHeight));
  scale.parent.width = w;
  scale.parent.height = h;
  scale.canvas.width = w;
  scale.canvas.height = h;
  scale.canvas.style.width = w + "px";
  scale.canvas.style.height = h + "px";

  const scenes = scale.game.scene.getScenes(false);
  for (const s of scenes) {
    const cams = s.sys?.cameras;
    if (cams) cams.resize(w, h);
  }

  return [w, h] as const;
}
