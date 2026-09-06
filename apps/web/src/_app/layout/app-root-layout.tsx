import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "@/_app/styles/global-styles";
import { DEFAULT_THEME, THEME_BOOTSTRAP_SCRIPT } from "@/features/select-theme";
import {
  createAbsolutePageUrl,
  SITE_ICON_PATH,
  SITE_NAME,
  SITE_URL,
} from "@/shared/config/site";
import {
  getLanguageDictionary,
  LANGUAGE_CODES,
  type LanguageCode,
} from "@/shared/i18n";

const OPEN_GRAPH_LOCALES: Record<LanguageCode, string> = {
  en: "en_US",
  pt: "pt_BR",
  es: "es_ES",
};

type MetadataRoute = "" | "about" | "upload" | "view";

export interface AppRootLayoutProps {
  readonly children: ReactNode;
  readonly language: LanguageCode;
}

export function AppRootLayout({ children, language }: AppRootLayoutProps) {
  return (
    <html lang={language} data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}

export function createSiteMetadata(
  language: LanguageCode,
  localized: boolean,
): Metadata {
  const dictionary = getLanguageDictionary(language);
  const metadata = createPageMetadata({
    language,
    localized,
    route: "",
    title: dictionary.meta.homeTitle,
    description: dictionary.meta.siteDescription,
  });
  return {
    ...metadata,
    title: {
      default: `${SITE_NAME} — ${dictionary.meta.homeTitle}`,
      template: `%s · ${SITE_NAME}`,
    },
  };
}

export interface CreatePageMetadataInput {
  readonly language: LanguageCode;
  readonly localized: boolean;
  readonly route: MetadataRoute;
  readonly title: string;
  readonly description: string;
}

export function createPageMetadata({
  language,
  localized,
  route,
  title,
  description,
}: CreatePageMetadataInput): Metadata {
  const canonicalUrl = createAbsolutePageUrl(
    route,
    localized ? language : undefined,
  );
  const languages = Object.fromEntries(
    LANGUAGE_CODES.map((code) => [code, createAbsolutePageUrl(route, code)]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: SITE_NAME,
    icons: {
      icon: [{ url: SITE_ICON_PATH, type: "image/svg+xml", sizes: "any" }],
      shortcut: SITE_ICON_PATH,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...languages,
        "x-default": createAbsolutePageUrl(route),
      },
    },
    openGraph: {
      type: "website",
      locale: OPEN_GRAPH_LOCALES[language],
      alternateLocale: LANGUAGE_CODES.filter((code) => code !== language).map(
        (code) => OPEN_GRAPH_LOCALES[code],
      ),
      siteName: SITE_NAME,
      title: `${SITE_NAME} — ${title}`,
      description,
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: `${SITE_NAME} — ${title}`,
      description,
    },
  };
}
