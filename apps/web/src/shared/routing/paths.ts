import type { LanguageCode } from "@/shared/i18n";

export const STATIC_PAGE_ROUTES = ["about", "upload", "view"] as const;

export type StaticPageRoute = (typeof STATIC_PAGE_ROUTES)[number];

export type SiteRoute = "" | StaticPageRoute | `d/${string}`;

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
