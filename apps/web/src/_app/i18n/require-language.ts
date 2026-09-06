import { notFound } from "next/navigation";

import { isLanguageCode, type LanguageCode } from "@/shared/i18n";

export function requireLanguage(value: string): LanguageCode {
  if (!isLanguageCode(value)) {
    notFound();
  }

  return value;
}
