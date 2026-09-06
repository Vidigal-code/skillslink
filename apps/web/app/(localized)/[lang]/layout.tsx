import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireLanguage } from "@/_app/i18n/require-language";
import { AppRootLayout, createSiteMetadata } from "@/_app/layout";
import { LANGUAGE_CODES } from "@/shared/i18n";

export const dynamicParams = false;

interface LayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly lang: string }>;
}

export function generateStaticParams() {
  return LANGUAGE_CODES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const language = requireLanguage((await params).lang);
  return createSiteMetadata(language, true);
}

export default async function LocalizedRootLayout({
  children,
  params,
}: LayoutProps) {
  const language = requireLanguage((await params).lang);
  return <AppRootLayout language={language}>{children}</AppRootLayout>;
}
