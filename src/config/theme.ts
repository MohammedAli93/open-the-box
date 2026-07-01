// Keys for the real "Open the Box" theme assets (in public/assets/theme).
export const THEME = {
  wood: "th-wood",
  rings: "th-rings",
  crumble: "th-crumble",
  lock: "th-lock",
  cross: "th-cross",
  pad: (color: string) => `th-pad-${color}`,
};

// The three cover colours cycle across the grid, matching the source.
export const PAD_CYCLE = ["blue", "red", "green"];
export const PAD_TINT: Record<string, number> = {
  blue: 0x2aa6de,
  red: 0xe23f7e,
  green: 0x2fa85f,
  grey: 0x9a9a9a,
};
export const DECOS = ["deco-pencil", "deco-pencil2", "deco-pen", "deco-rubber", "deco-sheet"];

// Covers are baked per colour (Canvas renderer can't tint reliably).
export const coverKey = (color: string) => `th-cover-${color}`;

// The crumble sprite sheet is 1200x154 = 6 frames of 200px.
export const CRUMBLE = { key: "th-crumble", frameWidth: 200, frameHeight: 154, frames: 6, anim: "crumble" };
