import { LinkFormatError } from "./errors";
import { DOCUMENT_ID_PATTERN, type DocumentMediaType } from "./model";

export interface ViewerUrlInput {
  readonly siteUrl: string;
  readonly payload: string;
}

export interface RawUrlInput {
  readonly siteUrl: string;
  readonly documentId: string;
  readonly mediaType: DocumentMediaType;
}

export function createViewerUrl(input: ViewerUrlInput): string {
  const url = parseSiteUrl(input.siteUrl);
  url.pathname = `${joinUrlPath(url.pathname, "view")}/`;
  url.hash = new URLSearchParams({ document: input.payload }).toString();
  return url.toString();
}

export function extractDocumentPayloadFromUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new LinkFormatError("INVALID_URL", "The viewer URL is invalid.", {
      cause: error,
    });
  }

  const fragment = url.hash.slice(1);
  if (fragment.length > 0) {
    const fragmentPayload = new URLSearchParams(fragment).get("document");
    return fragmentPayload ?? fragment;
  }

  return url.searchParams.get("document");
}

export function createRawDocumentUrl(input: RawUrlInput): string {
  assertDocumentId(input.documentId);
  const url = parseSiteUrl(input.siteUrl);
  url.pathname = joinUrlPath(url.pathname, "raw", `${input.documentId}.md`);
  return url.toString();
}

export function normalizeSiteUrl(value: string): string {
  const url = parseSiteUrl(value);
  url.pathname = ensureTrailingSlash(url.pathname);
  return url.toString();
}

function parseSiteUrl(value: string): URL {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !isLocalHttpUrl(url)) {
      throw new LinkFormatError(
        "INVALID_URL",
        "The site URL must use HTTPS; HTTP is accepted only on localhost.",
      );
    }

    url.search = "";
    url.hash = "";
    return url;
  } catch (error) {
    if (error instanceof LinkFormatError) {
      throw error;
    }

    throw new LinkFormatError("INVALID_URL", "The site URL is invalid.", {
      cause: error,
    });
  }
}

function joinUrlPath(basePath: string, ...segments: readonly string[]): string {
  const normalizedBase = basePath.replace(/\/+$/u, "");
  return `${normalizedBase}/${segments.map(encodeURIComponent).join("/")}`;
}

function ensureTrailingSlash(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function assertDocumentId(documentId: string): void {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) {
    throw new LinkFormatError(
      "INVALID_URL",
      "The document identifier is invalid.",
    );
  }
}

function isLocalHttpUrl(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]")
  );
}
