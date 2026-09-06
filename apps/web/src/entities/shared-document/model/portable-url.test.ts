import { describe, expect, it } from "vitest";

import {
  decodeDocumentPayload,
  extractDocumentPayloadFromUrl,
  MAX_DOCUMENT_BYTES,
} from "@skillslink/link-format";
import {
  createDocumentFromDraft,
  createPortableDocumentLinkSet,
  createPortableDocumentUrl,
} from "./portable-url";

describe("portable document editing", () => {
  it("infers the format and creates a URL that contains the edited document", () => {
    const document = createDocumentFromDraft({
      name: "updated.md",
      content: "Updated content",
    });
    const url = new URL(
      createPortableDocumentUrl(document, "https://example.com/tools/"),
    );

    expect(document.mediaType).toBe("text/markdown");
    expect(url.pathname).toBe("/tools/view/");
    expect(
      decodeDocumentPayload(
        extractDocumentPayloadFromUrl(url.toString()) ?? "",
      ),
    ).toEqual(document);
  });

  it("rejects an unsupported edited file name", () => {
    expect(() =>
      createDocumentFromDraft({ name: "unsafe.html", content: "content" }),
    ).toThrow();
  });

  it("rejects edited content above the shared document limit", () => {
    expect(() =>
      createDocumentFromDraft({
        name: "too-large.md",
        content: "a".repeat(MAX_DOCUMENT_BYTES + 1),
      }),
    ).toThrow();
  });

  it("creates a complete URL and focused links for Markdown headings", () => {
    const links = createPortableDocumentLinkSet(
      createDocumentFromDraft({
        name: "skill.md",
        content: "# Purpose\nRead this.\n## Workflow\nFollow this.\n",
      }),
      "https://example.com/",
    );

    expect(links.fullUrl).toContain("/view/#document=v2.");
    expect(links.parts.map((part) => part.title)).toEqual([
      "Purpose",
      "Read this.",
      "Workflow",
      "Follow this.",
    ]);
    expect(
      links.parts.every((part) => part.url.includes("#document=v2.")),
    ).toBe(true);
    expect(links.aiPrompt).not.toContain(links.fullUrl);
    for (const part of links.parts) {
      expect(links.aiPrompt).toContain(part.url);
    }
  });
});
