// Accepts "#rrggbb", "0xrrggbb", "rrggbb", or a number; returns a Phaser color int.
export function parseColor(c: string | number): number {
  if (typeof c === "number") return c >>> 0;
  const s = c.trim().replace(/^#/, "").replace(/^0x/i, "");
  const n = parseInt(s, 16);
  return Number.isNaN(n) ? 0xffffff : n;
}

// Picks a readable text color (near-black or white) for the given background.
export function contrastText(color: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1a1a1a" : "#ffffff";
}

// Darkens a color by `amount` (0..1) — used for borders/shadows derived from a base.
export function darken(color: number, amount: number): number {
  const r = Math.max(0, Math.round(((color >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((color >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((color & 0xff) * (1 - amount)));
  return (r << 16) | (g << 8) | b;
}
