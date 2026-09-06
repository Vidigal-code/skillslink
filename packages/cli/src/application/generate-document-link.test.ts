import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { NodeDocumentSourceReader } from "../infrastructure/node-document-source-reader";
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "../test/temporary-directory";
import { generateDocumentLink } from "./generate-document-link";

describe("generateDocumentLink", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it("reads Markdown and creates a self-contained viewer URL", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const sourcePath = join(directory, "guide.md");
    await writeFile(sourcePath, "# Guide\n\nHello, AI!", "utf8");

    const result = await generateDocumentLink(
      {
        filePath: sourcePath,
        siteUrl: "https://example.github.io/skillslink/",
      },
      {
        clock: () => new Date("2026-09-06T12:00:00.000Z"),
        identifierGenerator: createIdentifierGenerator([
          "00000000-0000-4000-8000-000000000001",
          "00000000-0000-4000-8000-000000000002",
          "00000000-0000-4000-8000-000000000003",
        ]),
        sourceReader: new NodeDocumentSourceReader(),
      },
    );

    expect(result).toMatchObject({
      name: "guide.md",
      mediaType: "text/markdown",
      createdAt: "2026-09-06T12:00:00.000Z",
    });
    expect(result.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(result.parts).toHaveLength(2);
    expect(result.parts[0]?.id).toBe("00000000-0000-4000-8000-000000000002");
    expect(result.url).toMatch(
      /^https:\/\/example\.github\.io\/skillslink\/view\/#document=v2\.[A-Za-z0-9_-]+$/u,
    );
  });

  it("retries UUID collisions across existing records and new parts", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const sourcePath = join(directory, "workflow.md");
    await writeFile(sourcePath, "# Start\nOne.\n## Finish\nTwo.", "utf8");
    const reservedId = "00000000-0000-4000-8000-000000000010";

    const result = await generateDocumentLink(
      {
        filePath: sourcePath,
        siteUrl: "https://example.com/",
        reservedIds: [reservedId],
      },
      {
        clock: () => new Date("2026-09-06T12:00:00.000Z"),
        identifierGenerator: createIdentifierGenerator([
          reservedId,
          "00000000-0000-4000-8000-000000000011",
          reservedId,
          "00000000-0000-4000-8000-000000000012",
          "00000000-0000-4000-8000-000000000013",
          "00000000-0000-4000-8000-000000000014",
          "00000000-0000-4000-8000-000000000015",
        ]),
        sourceReader: new NodeDocumentSourceReader(),
      },
    );

    expect([result.id, ...result.parts.map((part) => part.id)]).toEqual([
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
      "00000000-0000-4000-8000-000000000013",
      "00000000-0000-4000-8000-000000000014",
      "00000000-0000-4000-8000-000000000015",
    ]);
  });
});

function createIdentifierGenerator(values: readonly string[]): () => string {
  let index = 0;
  return () => values[index++] ?? "00000000-0000-4000-8000-ffffffffffff";
}
