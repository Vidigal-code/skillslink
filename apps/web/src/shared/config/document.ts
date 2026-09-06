import {
  MAX_DOCUMENT_KIBIBYTES,
  MAX_DOCUMENT_PART_KIBIBYTES,
  MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS,
} from "@skillslink/link-format";

export const DOCUMENT_SIZE_LIMIT_LABEL = `${MAX_DOCUMENT_KIBIBYTES} KiB`;
export const DOCUMENT_PART_SIZE_LIMIT_LABEL = `${MAX_DOCUMENT_PART_KIBIBYTES} KiB`;
export const PORTABLE_URL_CHARACTER_LIMIT_LABEL = String(
  MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS,
);

export function includeDocumentSizeLimit(message: string): string {
  return message
    .replaceAll("{limit}", DOCUMENT_SIZE_LIMIT_LABEL)
    .replaceAll("{partLimit}", DOCUMENT_PART_SIZE_LIMIT_LABEL)
    .replaceAll("{urlLimit}", PORTABLE_URL_CHARACTER_LIMIT_LABEL);
}
