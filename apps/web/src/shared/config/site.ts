import { normalizeSiteUrl } from "@skillslink/link-format";

import type { LanguageCode } from "@/shared/i18n";

export const SITE_NAME = "SkillsLink";
export const DEFAULT_SITE_URL = "https://vidigal-code.github.io/skillslink/";
export const PUBLIC_BASE_PATH = normalizeBasePath(
  process.env.NEXT_PUBLIC_BASE_PATH,
);
export const SITE_ICON_PATH = `${PUBLIC_BASE_PATH}/icon/skillslink-icon.svg`;
export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
);
export const SOURCE_REPOSITORY_URL =
  "https://github.com/Vidigal-code/skillslink";
export const INSTALL_COMMAND = "npm install --global @vidigal-code/skillslink";
export const GENERATE_COMMAND =
  "npx @vidigal-code/skillslink@latest generate file.md";

function normalizeBasePath(value: string | undefined): string {
  if (value === undefined || value === "" || value === "/") {
    return "";
  }

  return `/${value.replace(/^\/+|\/+$/gu, "")}`;
}

export function createViewerSiteUrl(
  language: LanguageCode,
  localized: boolean,
): string {
  return localized ? new URL(`${language}/`, SITE_URL).toString() : SITE_URL;
}

export function createCanonicalDocumentUrl(
  documentId: string,
  language?: LanguageCode,
): string {
  const route =
    language === undefined
      ? `d/${documentId}/`
      : `${language}/d/${documentId}/`;
  return new URL(route, SITE_URL).toString();
}

export function createAbsolutePageUrl(
  route: "" | "about" | "upload" | "view",
  language?: LanguageCode,
): string {
  const prefix = language === undefined ? "" : `${language}/`;
  const suffix = route === "" ? "" : `${route}/`;
  return new URL(`${prefix}${suffix}`, SITE_URL).toString();
}
