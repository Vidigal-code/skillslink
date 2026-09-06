import { describe, expect, it } from "vitest";

import { MAX_DOCUMENT_BYTES } from "@skillslink/link-format";

import {
  readBrowserDocument,
  type BrowserDocumentError,
} from "./read-browser-document";

describe("browser document reader", () => {
  it("reads a supported UTF-8 file without a network request", async () => {
    const file = createFile("guide.md", new TextEncoder().encode("# Hello 👋"));

    await expect(readBrowserDocument(file)).resolves.toEqual({
      name: "guide.md",
      mediaType: "text/markdown",
      content: "# Hello 👋",
    });
  });

  it("rejects unsupported extensions and invalid UTF-8", async () => {
    await expect(
      readBrowserDocument(
        createFile("notes.txt", new TextEncoder().encode("notes")),
      ),
    ).rejects.toThrow("Only .md files are accepted");
    await expect(
      readBrowserDocument(createFile("page.html", new Uint8Array())),
    ).rejects.toThrow();
    await expect(
      readBrowserDocument(createFile("broken.md", new Uint8Array([0xff]))),
    ).rejects.toThrow();
  });

  it("rejects an oversized file before reading its contents", async () => {
    let contentWasRead = false;
    const file = {
      name: "too-large.md",
      size: MAX_DOCUMENT_BYTES + 1,
      arrayBuffer: async () => {
        contentWasRead = true;
        return new ArrayBuffer(0);
      },
    } as File;

    await expect(readBrowserDocument(file)).rejects.toMatchObject<
      Partial<BrowserDocumentError>
    >({ code: "FILE_TOO_LARGE" });
    expect(contentWasRead).toBe(false);
  });
});

function createFile(name: string, bytes: Uint8Array): File {
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.slice().buffer,
  } as File;
}
