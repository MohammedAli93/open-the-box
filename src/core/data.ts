// Data model for the "Open the Box" game. Loaded at runtime from public/data.json
// so the client can change everything without rebuilding.

export type ContentKind = "text" | "image" | "both";

export interface Choice {
  type: "text" | "image";
  content: string; // text string, or an image path/key
}

export interface Question {
  type: ContentKind;
  text: string | null;
  // One image (string) OR many (string[]) OR none (null). Many are laid out in a
  // row on the pad.
  image: string | string[] | null;
  color: string; // "#rrggbb" — the box color
  choices: Choice[];
  correct: Choice; // matched against a choice by `content`
}

// Normalises a question's image field to a flat list of paths (0, 1, or many).
export function questionImages(q: Question): string[] {
  if (!q.image) return [];
  return (Array.isArray(q.image) ? q.image : [q.image]).filter(Boolean);
}

export interface GameData {
  title: string;
  // "reveal" = open a box to reveal its item (like Wordwall's Open the Box).
  // "quiz"   = open a box to answer a multiple-choice question.
  mode?: "reveal" | "quiz";
  // Seconds allowed per question (quiz mode only). 0 / omitted disables it.
  timerSeconds?: number;
  // Visual skin folder name under public/assets/skins (defaults to DEFAULT_SKIN).
  skin?: string;
  questions: Question[];
}

export function getMode(data: GameData): "reveal" | "quiz" {
  return data.mode === "quiz" ? "quiz" : "reveal";
}

let _data: GameData | null = null;

export function setGameData(data: GameData) {
  _data = data;
}

export function getGameData(): GameData {
  if (!_data) throw new Error("Game data not loaded yet");
  return _data;
}

// Collects every distinct image path referenced by the data so the loader can
// register them as textures (keyed by their path).
export function collectImagePaths(data: GameData): string[] {
  const set = new Set<string>();
  for (const q of data.questions) {
    if (q.type === "image" || q.type === "both") for (const p of questionImages(q)) set.add(p);
    for (const c of q.choices) if (c.type === "image" && c.content) set.add(c.content);
    if (q.correct.type === "image" && q.correct.content) set.add(q.correct.content);
  }
  return [...set];
}

// Whether a choice is the correct one (match by content, case-insensitive for text).
export function isCorrectChoice(question: Question, choice: Choice): boolean {
  if (choice.type !== question.correct.type) return false;
  if (choice.type === "text") {
    return choice.content.trim() === question.correct.content.trim();
  }
  return choice.content === question.correct.content;
}
