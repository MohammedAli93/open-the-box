// Arabic glyphs (diacritics, and tails on letters like ج ح خ ي) reach above and
// below the Latin line box that Phaser's canvas text measures, so they get
// clipped top & bottom. Padding the text canvas vertically by a fraction of the
// font size gives them room. Call after any setFontSize on Arabic text.
export const ARABIC_PAD_RATIO = 0.22;

export function padArabic(text: Phaser.GameObjects.Text, ratio = ARABIC_PAD_RATIO) {
  const raw = text.style.fontSize as string | number;
  const fs = typeof raw === "string" ? parseInt(raw, 10) : raw || 0;
  const pad = Math.ceil(fs * ratio);
  text.setPadding(2, pad, 2, pad);
  return text;
}

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
  // Vertical padding is applied each step so the fit accounts for the extra
  // room Arabic glyphs need (see padArabic) and never overflows the box.
  let lo = min;
  let hi = max;
  let best = min;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    text.setFontSize(mid);
    padArabic(text);
    text.setWordWrapWidth(maxWidth);
    if (text.displayWidth <= maxWidth && text.displayHeight <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  text.setFontSize(best);
  padArabic(text);
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
