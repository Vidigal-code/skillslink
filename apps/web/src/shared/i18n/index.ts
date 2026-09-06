import LangENJson from "./langs/LangEN.json";
import LangESJson from "./langs/LangES.json";
import LangPTJson from "./langs/LangPT.json";
import type { LanguageCode, LocaleDictionary } from "./model";

export type { LanguageCode, LocaleDictionary } from "./model";

export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const LANGUAGE_CODES = [
  "en",
  "pt",
  "es",
] as const satisfies readonly LanguageCode[];

export const LocaleLang: Record<LanguageCode, LocaleDictionary> = {
  pt: LangPTJson,
  en: LangENJson,
  es: LangESJson,
};

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGE_CODES.some((language) => language === value);
}

export function resolveLanguageCode(value: string | undefined): LanguageCode {
  return value !== undefined && isLanguageCode(value)
    ? value
    : DEFAULT_LANGUAGE;
}

export function getLanguageDictionary(
  language: LanguageCode,
): LocaleDictionary {
  return LocaleLang[language];
}

export function getIntlLocale(language: LanguageCode): string {
  const localeByLanguage: Record<LanguageCode, string> = {
    en: "en-US",
    pt: "pt-BR",
    es: "es-ES",
  };
  return localeByLanguage[language];
}
