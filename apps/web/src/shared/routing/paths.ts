import type { LanguageCode } from "@/shared/i18n";

export type SiteRoute = "" | "about" | "upload" | "view" | `d/${string}`;

export function createLocalizedPath(
  language: LanguageCode,
  route: SiteRoute,
): string {
  const suffix = route === "" ? "" : `/${route}`;
  return `/${language}${suffix}/`;
}

export function createDefaultPath(route: SiteRoute): string {
  return route === "" ? "/" : `/${route}/`;
}
