import { createPageMetadata } from "@/_app/layout";
import { UploadPage } from "@/_pages/upload";
import { createViewerSiteUrl } from "@/shared/config/site";
import { DEFAULT_LANGUAGE, getLanguageDictionary } from "@/shared/i18n";

const dictionary = getLanguageDictionary(DEFAULT_LANGUAGE);
export const metadata = createPageMetadata({
  language: DEFAULT_LANGUAGE,
  localized: false,
  route: "upload",
  title: dictionary.meta.uploadTitle,
  description: dictionary.meta.uploadDescription,
});

export default function Page() {
  return (
    <UploadPage
      language={DEFAULT_LANGUAGE}
      localized={false}
      viewerSiteUrl={createViewerSiteUrl(DEFAULT_LANGUAGE, false)}
    />
  );
}
