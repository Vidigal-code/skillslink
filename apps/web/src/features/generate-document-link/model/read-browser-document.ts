import {
  getDocumentMediaTypeFromFileName,
  MAX_DOCUMENT_BYTES,
  parseSharedDocument,
  type SharedDocument,
} from "@skillslink/link-format";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export type BrowserDocumentErrorCode = "FILE_TOO_LARGE" | "INVALID_DOCUMENT";

export class BrowserDocumentError extends TypeError {
  readonly code: BrowserDocumentErrorCode;

  constructor(
    code: BrowserDocumentErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BrowserDocumentError";
    this.code = code;
  }
}

export function assertSupportedBrowserDocument(file: File): void {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new BrowserDocumentError(
      "FILE_TOO_LARGE",
      "The document exceeds the size limit.",
    );
  }

  if (getDocumentMediaTypeFromFileName(file.name) === undefined) {
    throw new BrowserDocumentError(
      "INVALID_DOCUMENT",
      "Only .md files are accepted.",
    );
  }
}

export async function readBrowserDocument(file: File): Promise<SharedDocument> {
  assertSupportedBrowserDocument(file);
  const mediaType = getDocumentMediaTypeFromFileName(file.name);
  if (mediaType === undefined) {
    throw new BrowserDocumentError(
      "INVALID_DOCUMENT",
      "Only .md files are accepted.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new BrowserDocumentError(
      "FILE_TOO_LARGE",
      "The document exceeds the size limit.",
    );
  }

  try {
    return parseSharedDocument({
      name: file.name,
      mediaType,
      content: utf8Decoder.decode(bytes),
    });
  } catch (error) {
    throw new BrowserDocumentError(
      "INVALID_DOCUMENT",
      "The document must contain valid UTF-8 text.",
      { cause: error },
    );
  }
}
