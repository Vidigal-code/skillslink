import { describe, expect, it } from "vitest";

import {
  DOCUMENT_PART_SIZE_LIMIT_LABEL,
  DOCUMENT_SIZE_LIMIT_LABEL,
  includeDocumentSizeLimit,
} from "../config/document";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  LocaleLang,
  resolveLanguageCode,
} from "./index";

describe("translation dictionaries", () => {
  it("provides a complete non-empty dictionary for every exported language", () => {
    expect(Object.keys(LocaleLang).sort()).toEqual([...LANGUAGE_CODES].sort());

    for (const language of LANGUAGE_CODES) {
      expect(findEmptyString(LocaleLang[language])).toBeUndefined();
    }
  });

  it("provides a localized oversized-file error with the shared limit", () => {
    for (const language of LANGUAGE_CODES) {
      const message = includeDocumentSizeLimit(
        LocaleLang[language].upload.errors.fileTooLarge,
      );

      expect(message).toContain(DOCUMENT_SIZE_LIMIT_LABEL);
      expect(message).not.toContain("{limit}");
    }
  });

  it("substitutes the shared full-document and part limits", () => {
    for (const language of LANGUAGE_CODES) {
      const message = includeDocumentSizeLimit(
        LocaleLang[language].upload.splittingText,
      );

      expect(message).toContain(DOCUMENT_PART_SIZE_LIMIT_LABEL);
      expect(message).not.toContain("{partLimit}");
    }
  });

  it("resolves localized route parameters with an English fallback", () => {
    expect(resolveLanguageCode("pt")).toBe("pt");
    expect(resolveLanguageCode("es")).toBe("es");
    expect(resolveLanguageCode("unknown")).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguageCode(undefined)).toBe(DEFAULT_LANGUAGE);
  });
});

function findEmptyString(
  value: unknown,
  path = "dictionary",
): string | undefined {
  if (typeof value === "string") {
    return value.trim().length === 0 ? path : undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item, index) => findEmptyString(item, `${path}[${index}]`))
      .find((result) => result !== undefined);
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([key, item]) => findEmptyString(item, `${path}.${key}`))
      .find((result) => result !== undefined);
  }

  return undefined;
}
