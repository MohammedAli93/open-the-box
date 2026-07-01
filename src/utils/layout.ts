// Dynamic text sizing: grow/shrink a Text object's font size so it fills as much
// of the given box as possible while wrapping to fit within both width and height.
// Mirrors the measure-loop approach used in the previous game.
export function fitText(
  text: Phaser.GameObjects.Text,
  maxWidth: number,
  maxHeight: number,
  opts: { min?: number; max?: number } = {}
) {
  const min = opts.min ?? 8;
  const max = opts.max ?? 200;

  text.setWordWrapWidth(maxWidth);
  text.setScale(1);

  // Binary search for the largest size that fits within maxWidth x maxHeight.
  let lo = min;
  let hi = max;
  let best = min;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    text.setFontSize(mid);
    text.setWordWrapWidth(maxWidth);
    if (text.displayWidth <= maxWidth && text.displayHeight <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  text.setFontSize(best);
  text.setWordWrapWidth(maxWidth);
  return best;
}

// Scales an image to fit (contain) within a box while preserving aspect ratio.
export function fitImage(
  image: Phaser.GameObjects.Image,
  maxWidth: number,
  maxHeight: number
) {
  const w = image.frame.realWidth;
  const h = image.frame.realHeight;
  if (!w || !h) return;
  const scale = Math.min(maxWidth / w, maxHeight / h);
  image.setScale(scale);
}
