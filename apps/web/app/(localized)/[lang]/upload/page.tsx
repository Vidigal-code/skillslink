import type { Metadata } from "next";

import { requireLanguage } from "@/_app/i18n/require-language";
import { createPageMetadata } from "@/_app/layout";
import { UploadPage } from "@/_pages/upload";
import { createViewerSiteUrl } from "@/shared/config/site";
import { getLanguageDictionary } from "@/shared/i18n";

interface PageProps {
  readonly params: Promise<{ readonly lang: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const language = requireLanguage((await params).lang);
  const dictionary = getLanguageDictionary(language);
  return createPageMetadata({
    language,
    localized: true,
    route: "upload",
    title: dictionary.meta.uploadTitle,
    description: dictionary.meta.uploadDescription,
  });
}

export default async function Page({ params }: PageProps) {
  const language = requireLanguage((await params).lang);
  return (
    <UploadPage
      language={language}
      viewerSiteUrl={createViewerSiteUrl(language, true)}
    />
  );
}
