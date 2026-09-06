import type { ReactNode } from "react";

import { AppRootLayout, createSiteMetadata } from "@/_app/layout";
import { DEFAULT_LANGUAGE } from "@/shared/i18n";

export const metadata = createSiteMetadata(DEFAULT_LANGUAGE, false);

export default function DefaultRootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AppRootLayout language={DEFAULT_LANGUAGE}>{children}</AppRootLayout>;
}
