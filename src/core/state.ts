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
  // Seconds left on the shared countdown. It carries across questions; a correct
  // answer refills it, a wrong answer lets it keep draining. -1 = not started.
  static timerRemaining = -1;
  // Set when the shared countdown hits 0 — the game ends (loss).
  static timedOut = false;

  static reset() {
    this.answers.clear();
    this.opened.clear();
    this.timerRemaining = -1;
    this.timedOut = false;
  }

  static get score() {
    let n = 0;
    for (const r of this.answers.values()) if (r.correct) n++;
    return n;
  }
}
