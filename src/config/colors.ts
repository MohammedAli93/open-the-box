// Palette for the answer buttons (distinct, readable on white text).
export const CHOICE_COLORS = [
  0x227452, 0x0a6e6d, 0x183497, 0x77218f, 0x7e1a1a, 0x717922, 0x8f620e,
];

// Ink colours for answer text written on the white note cards.
export const TEXT_COLORS = [
  0xc0392b, 0x1c7a45, 0x2c5aa0, 0xd35400, 0x7d3c98, 0x117a8b,
];

// Ink colour for the word shown on the big notepad.
export const WORD_COLOR = 0x2f6b3f;

export class UniqueColor {
  constructor(private colors = [...CHOICE_COLORS]) {}

  next(): number {
    if (this.colors.length === 0) this.colors = [...CHOICE_COLORS];
    const index = Math.floor(Math.random() * this.colors.length);
    return this.colors.splice(index, 1)[0];
  }
}

export const FEEDBACK = {
  correct: 0x2e9e5b,
  incorrect: 0xc0392b,
};
