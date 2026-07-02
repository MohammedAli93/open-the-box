export const DPR = window.devicePixelRatio || 1;

// Sizes the canvas to the window at full device-pixel resolution for crisp
// rendering, and returns the [width, height] (in device pixels) to lay out against.
export function fitScreen(scale: Phaser.Scale.ScaleManager) {
  const cssW = Math.round(window.innerWidth);
  const cssH = Math.round(window.innerHeight);
  const widthDPR = Math.round(cssW * DPR);
  const heightDPR = Math.round(cssH * DPR);
  scale.parent.width = cssW;
  scale.parent.height = cssH;
  scale.canvas.width = widthDPR;
  scale.canvas.height = heightDPR;
  scale.canvas.style.width = cssW + "px";
  scale.canvas.style.height = cssH + "px";

  // Scenes lay out against the device-pixel size, so every scene's cameras must
  // cover the full device-pixel canvas — otherwise (on HiDPI / Windows display
  // scaling > 100%) each camera only fills the top-left 1/DPR of the canvas and
  // the rest renders as black margins.
  const scenes = scale.game.scene.getScenes(false);
  for (const s of scenes) {
    const cams = s.sys?.cameras;
    if (cams) cams.resize(widthDPR, heightDPR);
  }

  return [widthDPR, heightDPR] as const;
}
