import { toArabic } from "arabic-digits";
import { LANG } from "@/config/lang";

export const arabicNum = (n: number | string) => toArabic(String(n));

export function paginationArabic(index: number, total: number) {
  return toArabic(
    LANG.PAGINATION.replace("%a", String(index)).replace("%b", String(total))
  );
}
