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
  // Global countdown (seconds). Runs continuously once the game starts — on the
  // grid, while waiting, everywhere — and only a correct answer refills it.
  static timerRemaining = 0;
  static timerActive = false; // counting down (set true on Play)
  static timedOut = false; // hit 0 → game over

  static reset() {
    this.answers.clear();
    this.opened.clear();
    this.timerRemaining = 0;
    this.timerActive = false;
    this.timedOut = false;
  }

  static get score() {
    let n = 0;
    for (const r of this.answers.values()) if (r.correct) n++;
    return n;
  }
}
