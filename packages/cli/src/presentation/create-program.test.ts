import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { NodeDocumentWriter } from "../infrastructure/node-document-writer";
import { NodeDocumentSourceReader } from "../infrastructure/node-document-source-reader";
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "../test/temporary-directory";
import { createProgram, type ProgramServices } from "./create-program";
import type { CliOutput } from "./output";

describe("registered-link commands", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it("generates, registers, lists, opens, copies, and downloads by file name", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const sourcePath = join(directory, "guide.md");
    const registryPath = join(directory, "registry.json");
    const downloadDirectory = join(directory, "downloads");
    const content = "# Saved guide\n\nRecovered from its URL.";
    await writeFile(sourcePath, content, "utf8");

    const openedUrls: string[] = [];
    const copiedValues: string[] = [];
    const services: ProgramServices = {
      clock: () => new Date("2026-09-06T12:34:56.000Z"),
      identifierGenerator: createIdentifierGenerator(),
      sourceReader: new NodeDocumentSourceReader(),
      documentWriter: new NodeDocumentWriter(),
      openUrl: vi.fn(async (url: string) => {
        openedUrls.push(url);
      }),
      copyText: vi.fn(async (value: string) => {
        copiedValues.push(value);
      }),
    };
    const messages: string[] = [];
    const output: CliOutput = {
      write(message) {
        messages.push(message);
      },
      writeError(message) {
        throw new Error(message);
      },
    };
    const argumentsPrefix = ["node", "skillslink", "--store", registryPath];

    await createProgram(output, services).parseAsync([
      ...argumentsPrefix,
      "generate",
      sourcePath,
      "--save",
      "--no-open",
    ]);
    await createProgram(output, services).parseAsync([
      ...argumentsPrefix,
      "open",
      "guide.md",
    ]);
    await createProgram(output, services).parseAsync([
      ...argumentsPrefix,
      "copy",
      "guide.md",
    ]);
    await createProgram(output, services).parseAsync([
      ...argumentsPrefix,
      "download",
      "guide.md",
      "--directory",
      downloadDirectory,
    ]);
    await createProgram(output, services).parseAsync([
      ...argumentsPrefix,
      "prompt",
      "guide.md",
    ]);
    const listOutput: string[] = [];
    await createProgram(
      { ...output, write: (message) => listOutput.push(message) },
      services,
    ).parseAsync([...argumentsPrefix, "list"]);

    expect(openedUrls).toHaveLength(1);
    expect(copiedValues).toEqual(openedUrls);
    await expect(
      readFile(join(downloadDirectory, "guide.md"), "utf8"),
    ).resolves.toBe(content);
    expect(listOutput.join("\n")).toContain("CREATED (UTC)");
    expect(listOutput.join("\n")).toContain("PARTS (2)");
    expect(listOutput.join("\n")).toContain("...");
    expect(
      messages.some((message) =>
        message.includes("Created: 2026-09-06T12:34:56Z"),
      ),
    ).toBe(true);
    expect(
      messages.some((message) =>
        message.includes(
          "Learn this skill by opening every SkillsLink page URL below in order:",
        ),
      ),
    ).toBe(true);

    await createProgram(output, services).parseAsync([
      ...argumentsPrefix,
      "config",
      "--list-mode",
      "complete",
    ]);
    const configuredListOutput: string[] = [];
    await createProgram(
      { ...output, write: (message) => configuredListOutput.push(message) },
      services,
    ).parseAsync([...argumentsPrefix, "list"]);
    expect(configuredListOutput.join("\n")).toContain("AI PROMPT (COMPLETE)");
    expect(configuredListOutput.join("\n")).not.toContain("PARTS (2)");

    const storedConfiguration = JSON.parse(
      await readFile(join(directory, "config.json"), "utf8"),
    ) as {
      readonly settings: { readonly listDisplayMode: string };
    };
    expect(storedConfiguration.settings.listDisplayMode).toBe("complete");
  });

  it("rejects an unknown list mode as a configuration error", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const registryPath = join(directory, "registry.json");
    const output: CliOutput = { write: vi.fn(), writeError: vi.fn() };

    await expect(
      createProgram(output).parseAsync([
        "node",
        "skillslink",
        "--store",
        registryPath,
        "list",
        "--mode",
        "unknown",
      ]),
    ).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
  });
});

function createIdentifierGenerator(): () => string {
  let value = 0;
  return () => {
    value += 1;
    return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
  };
}
