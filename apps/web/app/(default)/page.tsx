import { HomePage } from "@/_pages/home";
import { DEFAULT_LANGUAGE } from "@/shared/i18n";

export default function Page() {
  return <HomePage language={DEFAULT_LANGUAGE} localized={false} />;
}
