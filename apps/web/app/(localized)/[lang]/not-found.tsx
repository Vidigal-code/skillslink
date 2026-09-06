"use client";

import { useParams } from "next/navigation";

import { ViewPage } from "@/_pages/view";
import { createViewerSiteUrl } from "@/shared/config/site";
import { resolveLanguageCode } from "@/shared/i18n";

export default function NotFound() {
  const { lang } = useParams<{ readonly lang: string }>();
  const language = resolveLanguageCode(lang);

  return (
    <ViewPage
      language={language}
      viewerSiteUrl={createViewerSiteUrl(language, true)}
    />
  );
}
