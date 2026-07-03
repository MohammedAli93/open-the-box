import { LANG, currentLanguage, locNum } from "@/config/lang";
import { toArabic } from "arabic-digits";

// Localized number (Arabic-Indic for "ar", Latin for "en"). Name kept for
// backwards compatibility; delegates to the language module.
export const arabicNum = (n: number | string) => locNum(n);

export function paginationArabic(index: number, total: number) {
  const s = LANG.PAGINATION.replace("%a", String(index)).replace("%b", String(total));
  return currentLanguage() === "ar" ? toArabic(s) : s;
}
