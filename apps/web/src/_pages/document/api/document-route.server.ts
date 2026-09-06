import type { Metadata } from "next";

import { createRawDocumentUrl } from "@skillslink/link-format";
import { createDocumentDescription } from "@/entities/shared-document";
import {
  getAllDocumentSnapshots,
  getDocumentSnapshot,
} from "@/entities/shared-document/index.server";
import {
  createCanonicalDocumentUrl,
  createViewerSiteUrl,
  SITE_NAME,
  SITE_URL,
} from "@/shared/config/site";
import { LANGUAGE_CODES, type LanguageCode } from "@/shared/i18n";

export const EMPTY_DOCUMENT_ROUTE_ID = "__empty__";

export async function getDocumentStaticParams() {
  const snapshots = await getAllDocumentSnapshots();
  return snapshots.length === 0
    ? [{ id: EMPTY_DOCUMENT_ROUTE_ID }]
    : snapshots.map((snapshot) => ({ id: snapshot.id }));
}

export async function getDocumentRouteData(
  id: string,
  language: LanguageCode,
  localized: boolean,
) {
  const snapshot = await getDocumentSnapshot(id);
  if (snapshot === undefined) {
    return undefined;
  }

  return {
    snapshot,
    rawUrl: createRawDocumentUrl({
      siteUrl: SITE_URL,
      documentId: id,
      mediaType: snapshot.document.mediaType,
    }),
    viewerSiteUrl: createViewerSiteUrl(language, localized),
  };
}

export async function createDocumentRouteMetadata(
  id: string,
  language: LanguageCode,
  localized: boolean,
): Promise<Metadata> {
  const snapshot = await getDocumentSnapshot(id);
  if (snapshot === undefined) {
    return {};
  }

  const title = snapshot.document.name;
  const description = createDocumentDescription(snapshot.document.content);
  const canonicalUrl = createCanonicalDocumentUrl(
    id,
    localized ? language : undefined,
  );
  const rawUrl = createRawDocumentUrl({
    siteUrl: SITE_URL,
    documentId: id,
    mediaType: snapshot.document.mediaType,
  });

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...Object.fromEntries(
          LANGUAGE_CODES.map((code) => [
            code,
            createCanonicalDocumentUrl(id, code),
          ]),
        ),
        "x-default": createCanonicalDocumentUrl(id),
      },
      types: { [snapshot.document.mediaType]: rawUrl },
    },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title,
      description,
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
