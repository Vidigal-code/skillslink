import {
  createDocumentParts,
  createAiLearningPrompt,
  createViewerUrl,
  encodeDocumentPayload,
  getDocumentMediaTypeFromFileName,
  parseSharedDocument,
  isRecommendedPortableUrl,
  type MarkdownHeadingLevel,
  type SharedDocument,
} from "@skillslink/link-format";

export interface DocumentDraft {
  readonly name: string;
  readonly content: string;
}

export interface PortableDocumentPartLink {
  readonly title: string;
  readonly headingLevel: MarkdownHeadingLevel | null;
  readonly name: string;
  readonly byteLength: number;
  readonly url: string;
}

export interface PortableDocumentLinkSet {
  readonly fullUrl: string;
  readonly showFullUrl: boolean;
  readonly parts: readonly PortableDocumentPartLink[];
  readonly aiPrompt: string;
}

export function createDocumentFromDraft(draft: DocumentDraft): SharedDocument {
  const mediaType = getDocumentMediaTypeFromFileName(draft.name);
  return parseSharedDocument({
    name: draft.name,
    mediaType,
    content: draft.content,
  });
}

export function createPortableDocumentUrl(
  document: SharedDocument,
  viewerSiteUrl: string,
): string {
  return createViewerUrl({
    siteUrl: viewerSiteUrl,
    payload: encodeDocumentPayload(document),
  });
}

export function createPortableDocumentLinkSet(
  document: SharedDocument,
  viewerSiteUrl: string,
): PortableDocumentLinkSet {
  const fullUrl = createPortableDocumentUrl(document, viewerSiteUrl);
  const parts = createDocumentParts(document).map((part) => ({
    title: part.title,
    headingLevel: part.headingLevel,
    name: part.document.name,
    byteLength: part.byteLength,
    url: createPortableDocumentUrl(part.document, viewerSiteUrl),
  }));

  return {
    fullUrl,
    showFullUrl: isRecommendedPortableUrl(fullUrl),
    parts,
    aiPrompt: createAiLearningPrompt({
      fullUrl,
      partUrls: parts.map((part) => part.url),
    }),
  };
}
