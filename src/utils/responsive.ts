export const DPR = window.devicePixelRatio || 1;

// Sizes the canvas to the window at full device-pixel resolution for crisp
// rendering, and returns the [width, height] (in device pixels) to lay out against.
export function fitScreen(scale: Phaser.Scale.ScaleManager) {
  const widthDPR = Math.round(window.innerWidth * DPR);
  const heightDPR = Math.round(window.innerHeight * DPR);
  scale.parent.width = Math.round(window.innerWidth);
  scale.parent.height = Math.round(window.innerHeight);
  scale.canvas.width = widthDPR;
  scale.canvas.height = heightDPR;
  scale.canvas.style.width = Math.round(window.innerWidth) + "px";
  scale.canvas.style.height = Math.round(window.innerHeight) + "px";
  return [widthDPR, heightDPR] as const;
}
