import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { MAX_DOCUMENT_BYTES } from "@skillslink/link-format";

import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "../test/temporary-directory";
import { NodeDocumentSourceReader } from "./node-document-source-reader";

describe("NodeDocumentSourceReader", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it("recognizes Markdown regardless of extension case", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const markdownPath = join(directory, "readme.MD");
    await writeFile(markdownPath, "# Readme", "utf8");
    const reader = new NodeDocumentSourceReader();

    await expect(reader.read(markdownPath)).resolves.toMatchObject({
      name: "readme.MD",
      mediaType: "text/markdown",
    });
  });

  it("rejects .txt and other unsupported extensions", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const textPath = join(directory, "notes.txt");
    const htmlPath = join(directory, "unsafe.html");
    await Promise.all([
      writeFile(textPath, "notes", "utf8"),
      writeFile(htmlPath, "<script>alert(1)</script>", "utf8"),
    ]);

    const reader = new NodeDocumentSourceReader();
    await expect(reader.read(textPath)).rejects.toThrow(
      "Only .md files are accepted",
    );
    await expect(reader.read(htmlPath)).rejects.toThrow(
      "Only .md files are accepted",
    );
  });

  it("rejects files larger than the link format limit", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const filePath = join(directory, "large.md");
    await writeFile(filePath, "a".repeat(MAX_DOCUMENT_BYTES + 1), "utf8");

    await expect(new NodeDocumentSourceReader().read(filePath)).rejects.toThrow(
      "exceeds the",
    );
  });
});
