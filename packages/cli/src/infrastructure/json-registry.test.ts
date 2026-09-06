import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "../test/temporary-directory";
import { JsonRegistry } from "./json-registry";

describe("JsonRegistry", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it("starts with the configured defaults when the JSON file does not exist", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const registry = new JsonRegistry({
      filePath: join(directory, "registry.json"),
      defaults: {
        siteUrl: "https://example.github.io/docs/",
        listDisplayMode: "divided",
      },
    });

    await expect(registry.read()).resolves.toEqual({
      schemaVersion: 2,
      settings: {
        siteUrl: "https://example.github.io/docs/",
        listDisplayMode: "divided",
      },
      links: [],
    });
  });

  it("persists one generated URL through its public interface", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const filePath = join(directory, "custom", "links.json");
    const registry = new JsonRegistry({
      filePath,
      defaults: {
        siteUrl: "https://example.com/",
        listDisplayMode: "divided",
      },
    });
    const link = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "guide.md",
      mediaType: "text/markdown" as const,
      url: "https://example.com/view/#document=v1.abc",
      createdAt: "2026-09-06T12:00:00.000Z",
      parts: [],
    };

    await registry.upsertLink(link);

    await expect(registry.read()).resolves.toMatchObject({ links: [link] });
    await expect(readFile(filePath, "utf8")).resolves.toContain('"guide.md"');
  });

  it("reads an existing Markdown-only version 1 registry", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const filePath = join(directory, "registry.json");
    await writeFile(
      filePath,
      JSON.stringify({
        schemaVersion: 1,
        settings: { siteUrl: "https://example.com/" },
        links: [
          {
            id: "0123456789abcdef",
            name: "legacy.md",
            mediaType: "text/markdown",
            url: "https://example.com/view/#document=v1.abc",
            createdAt: "2026-09-06T12:00:00.000Z",
          },
        ],
      }),
      "utf8",
    );
    const registry = new JsonRegistry({
      filePath,
      defaults: {
        siteUrl: "https://example.com/",
        listDisplayMode: "divided",
      },
    });

    await expect(registry.read()).resolves.toMatchObject({
      schemaVersion: 2,
      links: [{ name: "legacy.md", parts: [] }],
    });
  });

  it("rejects corrupt registry data instead of silently replacing it", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const filePath = join(directory, "registry.json");
    await writeFile(filePath, "{broken", "utf8");
    const registry = new JsonRegistry({
      filePath,
      defaults: {
        siteUrl: "https://example.com/",
        listDisplayMode: "divided",
      },
    });

    await expect(registry.read()).rejects.toThrow(
      "does not contain valid JSON",
    );
  });
});
