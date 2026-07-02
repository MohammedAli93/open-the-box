export const DPR = 1;

// Phaser's RESIZE scale mode + CSS own the canvas now (see index.html / style.css
// and main.ts): the canvas fills its full-window parent automatically and the
// browser handles fullscreen with zero custom math — exactly like a normal web
// page. This just reports Phaser's current game size for the scenes to lay out
// against.
export function fitScreen(scale: Phaser.Scale.ScaleManager) {
  return [Math.max(1, Math.round(scale.width)), Math.max(1, Math.round(scale.height))] as const;
}
