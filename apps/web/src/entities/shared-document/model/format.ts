import type { LocaleDictionary } from "@/shared/i18n";

const META_DESCRIPTION_MAX_LENGTH = 155;

export function formatDocumentType(labels: LocaleDictionary["common"]): string {
  return labels.markdown;
}

export function createDocumentDescription(content: string): string {
  const normalized = content
    .replace(/^#{1,6}\s+/gmu, "")
    .replace(/[`*_>[\]]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  return normalized.length <= META_DESCRIPTION_MAX_LENGTH
    ? normalized
    : `${normalized.slice(0, META_DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
}
