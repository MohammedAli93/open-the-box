// User-facing UI strings + language/direction handling.
//
// The active language is chosen by the `lang` field in data.json ("ar" | "en").
// "ar" renders right-to-left (RTL) with Arabic-Indic digits; "en" renders
// left-to-right (LTR) with Latin digits. Only the CHROME strings below switch;
// the question content itself always comes from data.json verbatim.
import { toArabic } from "arabic-digits";

export type Lang = "ar" | "en";

type Strings = {
  LOADING: string;
  COMPLETE_HEADER: string;
  COMPLETE_SCORE: string;
  COMPLETE_DONE: string;
  COMPLETE_RESTART: string;
  REVEAL_NEXT: string;
  START_HEADER: string;
  START_PLAY: string;
  START_INSTRUCTION: string;
  GRID_HINT: string;
  MENU_HEADER: string;
  MENU_RESUME: string;
  MENU_RESTART: string;
  MENU_RESULTS: string;
  MENU_SUBMIT: string;
  AUDIO_BGM: string;
  AUDIO_SFX: string;
  PAGINATION: string;
};

const STRINGS: Record<Lang, Strings> = {
  ar: {
    LOADING: "جاري التحميل ...",
    COMPLETE_HEADER: "أحسنت!",
    COMPLETE_SCORE: "النتيجة",
    COMPLETE_DONE: "تم فتح كل الصناديق",
    COMPLETE_RESTART: "العب مرة أخرى",
    REVEAL_NEXT: "انقر للمتابعة",

    START_HEADER: "افتح الصندوق",
    START_PLAY: "البدء",
    START_INSTRUCTION: "انقر فوق كل صندوق بالتناوب لفتحه والكشف عن العنصر الذي بداخله.",
    GRID_HINT: "انقر على واحدة لفتحها",

    MENU_HEADER: "القائمة",
    MENU_RESUME: "متابعة",
    MENU_RESTART: "إعادة اللعبة",
    MENU_RESULTS: "عرض النتيجة",
    MENU_SUBMIT: "عرض النتيجة",

    AUDIO_BGM: "الموسيقى",
    AUDIO_SFX: "المؤثرات الصوتية",
    // %a = current, %b = total
    PAGINATION: "%a / %b",
  },
  en: {
    LOADING: "Loading ...",
    COMPLETE_HEADER: "Well done!",
    COMPLETE_SCORE: "Score",
    COMPLETE_DONE: "All boxes opened",
    COMPLETE_RESTART: "Play again",
    REVEAL_NEXT: "Tap to continue",

    START_HEADER: "Open the Box",
    START_PLAY: "Start",
    START_INSTRUCTION: "Tap each box in turn to open it and reveal the item inside.",
    GRID_HINT: "Tap one to open it",

    MENU_HEADER: "Menu",
    MENU_RESUME: "Resume",
    MENU_RESTART: "Restart",
    MENU_RESULTS: "Show results",
    MENU_SUBMIT: "Show results",

    AUDIO_BGM: "Music",
    AUDIO_SFX: "Sound effects",
    // %a = current, %b = total
    PAGINATION: "%a / %b",
  },
};

let currentLang: Lang = "ar";

// A live object mutated in place by setLanguage(), so modules that
// `import { LANG }` once always see the active language's strings.
export const LANG: Strings = { ...STRINGS.ar };

export function setLanguage(lang?: string | null) {
  currentLang = lang === "en" ? "en" : "ar";
  Object.assign(LANG, STRINGS[currentLang]);
}

export function currentLanguage(): Lang {
  return currentLang;
}

// True when the active language reads right-to-left. Phaser's CANVAS renderer
// also needs Text set RTL to paint the Arabic font correctly (see the memory
// note); Latin text renders fine LTR.
export function isRTL(): boolean {
  return currentLang === "ar";
}

// Localized digits: Arabic-Indic (٠١٢٣) for "ar", plain Latin for "en".
export function locNum(n: number | string): string {
  return currentLang === "ar" ? toArabic(String(n)) : String(n);
}

// Orders a "score / total" pair for display. RTL reverses visual token order,
// so for Arabic we write total-first to end up showing score-first.
export function scorePair(score: number | string, total: number | string): string {
  return isRTL() ? `${locNum(total)} / ${locNum(score)}` : `${locNum(score)} / ${locNum(total)}`;
}
