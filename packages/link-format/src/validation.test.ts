import { describe, expect, it } from "vitest";

import { LinkFormatError } from "./errors";
import {
  getDocumentMediaTypeFromFileName,
  parseSharedDocument,
} from "./validation";

describe("document validation", () => {
  it("recognizes Markdown regardless of extension case", () => {
    expect(getDocumentMediaTypeFromFileName("guide.md")).toBe("text/markdown");
    expect(getDocumentMediaTypeFromFileName("GUIDE.MD")).toBe("text/markdown");
  });

  it("rejects unsupported names and paths", () => {
    expect(getDocumentMediaTypeFromFileName("image.png")).toBeUndefined();
    expect(getDocumentMediaTypeFromFileName("notes.txt")).toBeUndefined();
    expect(getDocumentMediaTypeFromFileName("nested/guide.md")).toBeUndefined();
  });

  it("rejects a media type that does not match the file extension", () => {
    expect(() =>
      parseSharedDocument({
        name: "guide.md",
        mediaType: "invalid/markdown",
        content: "hello",
      }),
    ).toThrow(LinkFormatError);
  });
});
