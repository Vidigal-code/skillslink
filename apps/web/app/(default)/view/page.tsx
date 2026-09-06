import { createPageMetadata } from "@/_app/layout";
import { ViewPage } from "@/_pages/view";
import { createViewerSiteUrl } from "@/shared/config/site";
import { DEFAULT_LANGUAGE, getLanguageDictionary } from "@/shared/i18n";

const dictionary = getLanguageDictionary(DEFAULT_LANGUAGE);
export const metadata = createPageMetadata({
  language: DEFAULT_LANGUAGE,
  localized: false,
  route: "view",
  title: dictionary.meta.viewTitle,
  description: dictionary.meta.viewDescription,
});

export default function Page() {
  return (
    <ViewPage
      language={DEFAULT_LANGUAGE}
      localized={false}
      viewerSiteUrl={createViewerSiteUrl(DEFAULT_LANGUAGE, false)}
    />
  );
}
