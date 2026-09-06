export const LINK_FORMAT_VERSION = 2 as const;
export const SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const MAX_DOCUMENT_KIBIBYTES = 64;
export const MAX_DOCUMENT_PART_KIBIBYTES = 1;
const BYTES_PER_KIBIBYTE = 1024;
export const MAX_DOCUMENT_BYTES = MAX_DOCUMENT_KIBIBYTES * BYTES_PER_KIBIBYTE;
export const MAX_DOCUMENT_PART_BYTES =
  MAX_DOCUMENT_PART_KIBIBYTES * BYTES_PER_KIBIBYTE;
export const MAX_DOCUMENT_PARTS = 256;
export const MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS = 8_000;
export const MAX_DOCUMENT_NAME_LENGTH = 255;
export const DOCUMENT_ID_PATTERN = /^[a-f0-9]{16}$/u;

export const DOCUMENT_MEDIA_TYPES = ["text/markdown"] as const;

export type DocumentMediaType = (typeof DOCUMENT_MEDIA_TYPES)[number];

export interface SharedDocument {
  readonly name: string;
  readonly mediaType: DocumentMediaType;
  readonly content: string;
}

export type MarkdownHeadingLevel = 1 | 2 | 3;

export interface SharedDocumentPart {
  readonly title: string;
  readonly headingLevel: MarkdownHeadingLevel | null;
  readonly byteLength: number;
  readonly document: SharedDocument;
}

export interface DocumentSnapshot {
  readonly schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  readonly id: string;
  readonly publishedAt: string;
  readonly document: SharedDocument;
}

export interface CreateSnapshotInput {
  readonly id: string;
  readonly publishedAt: string;
  readonly document: SharedDocument;
}
