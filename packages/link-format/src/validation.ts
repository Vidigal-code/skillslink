import {
  DOCUMENT_ID_PATTERN,
  DOCUMENT_MEDIA_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_NAME_LENGTH,
  SNAPSHOT_SCHEMA_VERSION,
  type DocumentMediaType,
  type DocumentSnapshot,
  type SharedDocument,
} from "./model";
import { LinkFormatError } from "./errors";

const textEncoder = new TextEncoder();
const MEDIA_TYPE_BY_EXTENSION = {
  ".md": "text/markdown",
} as const satisfies Readonly<Record<string, DocumentMediaType>>;

export function parseSharedDocument(value: unknown): SharedDocument {
  if (!isRecord(value)) {
    throw new LinkFormatError(
      "INVALID_DOCUMENT",
      "The document must be an object.",
    );
  }

  const { name, mediaType, content } = value;

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new LinkFormatError(
      "INVALID_DOCUMENT",
      "The document must have a name.",
    );
  }

  if (name.length > MAX_DOCUMENT_NAME_LENGTH) {
    throw new LinkFormatError(
      "INVALID_DOCUMENT",
      `The name can contain at most ${MAX_DOCUMENT_NAME_LENGTH} characters.`,
    );
  }

  const inferredMediaType = getDocumentMediaTypeFromFileName(name);
  if (inferredMediaType === undefined || inferredMediaType !== mediaType) {
    throw new LinkFormatError(
      "INVALID_DOCUMENT",
      "The file name must end in .md and match the Markdown media type.",
    );
  }

  if (!isDocumentMediaType(mediaType)) {
    throw new LinkFormatError(
      "INVALID_DOCUMENT",
      "The format must be Markdown.",
    );
  }

  if (typeof content !== "string") {
    throw new LinkFormatError(
      "INVALID_DOCUMENT",
      "The content must be UTF-8 text.",
    );
  }

  const byteLength = textEncoder.encode(content).byteLength;
  if (byteLength > MAX_DOCUMENT_BYTES) {
    throw new LinkFormatError(
      "INVALID_DOCUMENT",
      `The document exceeds the ${MAX_DOCUMENT_BYTES} byte limit.`,
    );
  }

  return { name, mediaType, content };
}

export function parseDocumentSnapshot(value: unknown): DocumentSnapshot {
  if (!isRecord(value) || value.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new LinkFormatError(
      "INVALID_SNAPSHOT",
      "The snapshot version is not supported.",
    );
  }

  if (typeof value.id !== "string" || !DOCUMENT_ID_PATTERN.test(value.id)) {
    throw new LinkFormatError(
      "INVALID_SNAPSHOT",
      "The snapshot has an invalid identifier.",
    );
  }

  if (typeof value.publishedAt !== "string" || !isIsoDate(value.publishedAt)) {
    throw new LinkFormatError(
      "INVALID_SNAPSHOT",
      "The snapshot has an invalid date.",
    );
  }

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    id: value.id,
    publishedAt: value.publishedAt,
    document: parseSharedDocument(value.document),
  };
}

export function parseLegacyEncodedEnvelope(value: unknown): SharedDocument {
  if (!isRecord(value)) {
    throw new LinkFormatError(
      "INVALID_PAYLOAD",
      "The encoded content is invalid.",
    );
  }

  if (value.v !== 1) {
    throw new LinkFormatError(
      "UNSUPPORTED_VERSION",
      `Link version ${String(value.v)} is not supported.`,
    );
  }

  return parseSharedDocument({
    name: value.n,
    mediaType: value.m,
    content: value.c,
  });
}

export function isDocumentMediaType(
  value: unknown,
): value is DocumentMediaType {
  return DOCUMENT_MEDIA_TYPES.some((mediaType) => mediaType === value);
}

export function getDocumentMediaTypeFromFileName(
  fileName: string,
): DocumentMediaType | undefined {
  if (fileName.includes("/") || fileName.includes("\\")) {
    return undefined;
  }

  const normalizedName = fileName.toLowerCase();
  const entry = Object.entries(MEDIA_TYPE_BY_EXTENSION).find(([extension]) =>
    normalizedName.endsWith(extension),
  );
  return entry?.[1];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
