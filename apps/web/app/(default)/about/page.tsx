import { createPageMetadata } from "@/_app/layout";
import { AboutPage } from "@/_pages/about";
import { DEFAULT_LANGUAGE, getLanguageDictionary } from "@/shared/i18n";

const dictionary = getLanguageDictionary(DEFAULT_LANGUAGE);
export const metadata = createPageMetadata({
  language: DEFAULT_LANGUAGE,
  localized: false,
  route: "about",
  title: dictionary.meta.aboutTitle,
  description: dictionary.meta.aboutDescription,
});

export default function Page() {
  return <AboutPage language={DEFAULT_LANGUAGE} localized={false} />;
}
