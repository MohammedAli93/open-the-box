export interface AnswerRecord {
  selectedContent: string;
  correct: boolean;
}

export class State {
  // Keyed by question index (quiz mode).
  static answers = new Map<number, AnswerRecord>();
  // Box indices already opened (reveal mode).
  static opened = new Set<number>();
  static sfx = true;
  static bgm = true;

  static reset() {
    this.answers.clear();
    this.opened.clear();
  }

  static get score() {
    let n = 0;
    for (const r of this.answers.values()) if (r.correct) n++;
    return n;
  }
}
