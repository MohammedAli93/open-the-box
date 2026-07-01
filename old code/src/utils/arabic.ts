import { LANG } from "@/config/lang";
import { toArabic } from "arabic-digits";

export function paginationArabic(index: number, total: number) {
  return toArabic(
    LANG.GAME_PAGINATION.replace("%a", String(index)).replace(
      "%b",
      String(total)
    )
  );
}
