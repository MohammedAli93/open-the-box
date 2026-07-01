export const COLORS = [
  0x227452, 0x0a6e6d, 0x183497, 0x77218f, 0x7e1a1a, 0x717922, 0x8f620e,
];

export class UniqueColor {
  constructor(private colors = [...COLORS]) {}

  getRandomColor() {
    if (this.colors.length === 0) {
      this.colors = [...COLORS];
    }
    const index = Math.floor(Math.random() * this.colors.length);
    const colorsRemoved = this.colors.splice(index, 1);
    return colorsRemoved[0];
  }
}
