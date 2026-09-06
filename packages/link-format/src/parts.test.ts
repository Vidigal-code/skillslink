import { describe, expect, it } from "vitest";

import { encodeDocumentPayload } from "./codec";
import {
  MAX_DOCUMENT_PART_BYTES,
  MAX_DOCUMENT_PARTS,
  MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS,
} from "./model";
import { createDocumentParts } from "./parts";
import { createViewerUrl } from "./urls";

describe("document link parts", () => {
  it("creates non-overlapping Markdown parts for level 1 to 3 headings", () => {
    const content = [
      "Preamble\n",
      "# Install\n",
      "Install content.\n",
      "## Configure\n",
      "Configuration content.\n",
      "### Verify\n",
      "Verification content.\n",
      "#### Ignored\n",
      "Still part of Verify.\n",
    ].join("");

    const parts = createDocumentParts({
      name: "skill.md",
      mediaType: "text/markdown",
      content,
    });

    expect(parts.map((part) => part.title)).toEqual([
      "Preamble",
      "Install",
      "Install content.",
      "Configure",
      "Configuration content.",
      "Verify",
      "Verification content.",
      "Ignored",
      "Still part of Verify.",
    ]);
    expect(parts.map((part) => part.headingLevel)).toEqual([
      null,
      1,
      null,
      2,
      null,
      3,
      null,
      null,
      null,
    ]);
    expect(parts.map((part) => part.document.content).join("")).toBe(content);
  });

  it("ignores heading-like lines inside fenced code", () => {
    const parts = createDocumentParts({
      name: "skill.md",
      mediaType: "text/markdown",
      content: "# Real\n```md\n## Not a section\n```\nDone.\n",
    });

    expect(parts).toHaveLength(3);
    expect(parts[0]?.title).toBe("Real");
    expect(parts[1]?.title).toBe("Code (md)");
    expect(parts.some((part) => part.title === "Not a section")).toBe(false);
    expect(parts.map((part) => part.document.content).join("")).toBe(
      "# Real\n```md\n## Not a section\n```\nDone.\n",
    );
  });

  it("automatically chunks oversized content without breaking Unicode", () => {
    const content = `# Large\n${"á".repeat(MAX_DOCUMENT_PART_BYTES)}`;
    const parts = createDocumentParts({
      name: "large.md",
      mediaType: "text/markdown",
      content,
    });

    expect(parts.length).toBeGreaterThan(1);
    expect(
      parts.every((part) => part.byteLength <= MAX_DOCUMENT_PART_BYTES),
    ).toBe(true);
    expect(parts.map((part) => part.document.content).join("")).toBe(content);
  });

  it("uses paragraph boundaries before splitting oversized paragraphs", () => {
    const firstParagraph = "a".repeat(3_000);
    const secondParagraph = "b".repeat(3_000);
    const content = `# Large\n\n${firstParagraph}\n\n${secondParagraph}`;
    const parts = createDocumentParts({
      name: "large.md",
      mediaType: "text/markdown",
      content,
    });

    expect(parts[0]?.document.content).toBe("# Large\n\n");
    expect(parts.length).toBeGreaterThan(3);
    expect(
      parts.every((part) => part.byteLength <= MAX_DOCUMENT_PART_BYTES),
    ).toBe(true);
    expect(parts.map((part) => part.document.content).join("")).toBe(content);
  });

  it("does not close a fenced block when a code line starts with backticks", () => {
    const parts = createDocumentParts({
      name: "fence.md",
      mediaType: "text/markdown",
      content: "# Real\n```md\n```still code\n## Not a section\n```\nDone.\n",
    });

    expect(parts).toHaveLength(3);
    expect(parts[0]?.title).toBe("Real");
    expect(parts[1]?.title).toBe("Code (md)");
  });

  it("creates a focused link even for one small Markdown paragraph", () => {
    const parts = createDocumentParts({
      name: "note.md",
      mediaType: "text/markdown",
      content: "Small note.",
    });

    expect(parts).toHaveLength(1);
    expect(parts[0]?.document).toEqual({
      name: "p1.md",
      mediaType: "text/markdown",
      content: "Small note.",
    });
  });

  it("creates one divided link for an empty Markdown document", () => {
    const parts = createDocumentParts({
      name: "empty.md",
      mediaType: "text/markdown",
      content: "",
    });

    expect(parts).toEqual([
      {
        title: "Document",
        headingLevel: null,
        byteLength: 0,
        document: {
          name: "p1.md",
          mediaType: "text/markdown",
          content: "",
        },
      },
    ]);
  });

  it("preserves whitespace before the first heading in an introduction part", () => {
    const content = "\n\n# Start\nContent.";
    const parts = createDocumentParts({
      name: "spaced.md",
      mediaType: "text/markdown",
      content,
    });

    expect(parts[0]?.document.content).toBe("\n\n");
    expect(parts.map((part) => part.document.content).join("")).toBe(content);
  });

  it("splits list items and keeps other GFM block types intact", () => {
    const content = [
      "- First item\n",
      "- Second item\n",
      "\n",
      "```ts\n",
      "const ready = true;\n",
      "```\n",
      "\n",
      "> A quote\n",
      "\n",
      "| Key | Value |\n",
      "| --- | --- |\n",
      "| mode | safe |\n",
    ].join("");
    const parts = createDocumentParts({
      name: "blocks.md",
      mediaType: "text/markdown",
      content,
    });

    expect(parts.map((part) => part.title)).toEqual([
      "First item",
      "Second item",
      "Code (ts)",
      "A quote",
      "Key Value mode safe",
    ]);
    expect(parts.map((part) => part.document.content).join("")).toBe(content);
  });

  it("bounds pathological Markdown with many semantic blocks", () => {
    const content = Array.from(
      { length: 2_000 },
      (_, index) => `- Item ${index + 1}\n`,
    ).join("");
    const parts = createDocumentParts({
      name: "many-items.md",
      mediaType: "text/markdown",
      content,
    });

    expect(parts.length).toBeLessThanOrEqual(MAX_DOCUMENT_PARTS);
    expect(
      parts.every((part) => part.byteLength <= MAX_DOCUMENT_PART_BYTES),
    ).toBe(true);
    expect(parts.map((part) => part.document.content).join("")).toBe(content);
  });

  it("keeps every divided viewer URL below the compatibility threshold", () => {
    const content = Array.from({ length: 60_000 }, (_, index) =>
      String.fromCharCode(33 + ((index * 47) % 90)),
    ).join("");
    const parts = createDocumentParts({
      name: "large.md",
      mediaType: "text/markdown",
      content,
    });
    const urls = parts.map((part) =>
      createViewerUrl({
        siteUrl: "https://vidigal-code.github.io/skillslink/",
        payload: encodeDocumentPayload(part.document),
      }),
    );

    expect(urls.length).toBeGreaterThan(1);
    expect(
      urls.every(
        (url) => url.length <= MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS,
      ),
    ).toBe(true);
  });
});
