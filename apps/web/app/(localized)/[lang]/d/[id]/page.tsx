import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireLanguage } from "@/_app/i18n/require-language";
import {
  createDocumentRouteMetadata,
  getDocumentRouteData,
  getDocumentStaticParams,
} from "@/_pages/document/api/document-route.server";
import { DocumentPage } from "@/_pages/document";

export const dynamicParams = false;

interface PageProps {
  readonly params: Promise<{
    readonly lang: string;
    readonly id: string;
  }>;
}

export function generateStaticParams() {
  return getDocumentStaticParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id, lang } = await params;
  return createDocumentRouteMetadata(id, requireLanguage(lang), true);
}

export default async function Page({ params }: PageProps) {
  const { id, lang } = await params;
  const language = requireLanguage(lang);
  const data = await getDocumentRouteData(id, language, true);
  if (data === undefined) {
    notFound();
  }

  return <DocumentPage {...data} language={language} />;
}
