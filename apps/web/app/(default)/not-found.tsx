import { ViewPage } from "@/_pages/view";
import { createViewerSiteUrl } from "@/shared/config/site";
import { DEFAULT_LANGUAGE } from "@/shared/i18n";

export default function NotFound() {
  return (
    <ViewPage
      language={DEFAULT_LANGUAGE}
      localized={false}
      viewerSiteUrl={createViewerSiteUrl(DEFAULT_LANGUAGE, false)}
    />
  );
}
