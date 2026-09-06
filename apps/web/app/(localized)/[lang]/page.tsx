import { requireLanguage } from "@/_app/i18n/require-language";
import { HomePage } from "@/_pages/home";

interface PageProps {
  readonly params: Promise<{ readonly lang: string }>;
}

export default async function Page({ params }: PageProps) {
  const language = requireLanguage((await params).lang);
  return <HomePage language={language} />;
}
