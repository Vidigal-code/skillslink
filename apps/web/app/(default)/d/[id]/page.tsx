import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  createDocumentRouteMetadata,
  getDocumentRouteData,
  getDocumentStaticParams,
} from "@/_pages/document/api/document-route.server";
import { DocumentPage } from "@/_pages/document";
import { DEFAULT_LANGUAGE } from "@/shared/i18n";

export const dynamicParams = false;

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export function generateStaticParams() {
  return getDocumentStaticParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return createDocumentRouteMetadata(id, DEFAULT_LANGUAGE, false);
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const data = await getDocumentRouteData(id, DEFAULT_LANGUAGE, false);
  if (data === undefined) {
    notFound();
  }

  return (
    <DocumentPage {...data} language={DEFAULT_LANGUAGE} localized={false} />
  );
}
