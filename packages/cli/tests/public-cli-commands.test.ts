import { access, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createAiLearningPrompt } from "@skillslink/link-format";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NodeDocumentWriter } from "../src/infrastructure/node-document-writer";
import { NodeDocumentSourceReader } from "../src/infrastructure/node-document-source-reader";
import {
  createProgram,
  type ProgramServices,
} from "../src/presentation/create-program";
import type { CliOutput } from "../src/presentation/output";
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "../src/test/temporary-directory";

const promptMocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  confirm: vi.fn(),
  path: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
}));

const TEST_HOME_DIRECTORY = join(
  tmpdir(),
  `skillslink-public-cli-home-${process.pid}`,
);

vi.mock("@clack/prompts", () => ({
  ...promptMocks,
  isCancel: (value: unknown) => typeof value === "symbol",
}));

describe("public CLI command surface", () => {
  const directories: string[] = [];

  afterEach(async () => {
    promptMocks.cancel.mockReset();
    promptMocks.confirm.mockReset();
    promptMocks.path.mockReset();
    promptMocks.select.mockReset();
    promptMocks.text.mockReset();
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it("exposes every canonical command and compatibility alias", () => {
    const commands = createProgram(
      createOutput().output,
      createServices(),
    ).commands.map((command) => ({
      aliases: command.aliases(),
      name: command.name(),
    }));

    expect(commands).toEqual([
      { name: "generate", aliases: ["publish", "create"] },
      { name: "list", aliases: ["ls"] },
      { name: "open", aliases: [] },
      { name: "copy", aliases: [] },
      { name: "download", aliases: ["get"] },
      { name: "prompt", aliases: [] },
      { name: "copy-prompt", aliases: [] },
      { name: "remove", aliases: ["rm"] },
      { name: "config", aliases: [] },
      { name: "where", aliases: [] },
    ]);
  });

  it("keeps every declared public option signature stable", () => {
    const program = createProgram(createOutput().output, createServices());
    const signatures = Object.fromEntries([
      ["skillslink", program.options.map((option) => option.flags)],
      ...program.commands.map(
        (command) =>
          [
            command.name(),
            command.options.map((option) => option.flags),
          ] as const,
      ),
    ]);

    expect(signatures).toEqual({
      skillslink: [
        "-V, --version",
        "-c, --config <file>",
        "-s, --store <file>",
      ],
      generate: ["--json", "--save", "--no-open"],
      list: ["--json", "--mode <mode>"],
      open: [],
      copy: [],
      download: ["-d, --directory <path>", "--overwrite"],
      prompt: ["--copy"],
      "copy-prompt": [],
      remove: ["-y, --yes"],
      config: ["--site-url <url>", "--list-mode <mode>"],
      where: [],
    });
  });

  it("prints command help when no command is provided outside a TTY", async () => {
    const help: string[] = [];
    const program = createProgram(createOutput().output, createServices());
    program.configureOutput({
      writeErr: (value) => help.push(value),
      writeOut: (value) => help.push(value),
    });

    await withTerminalMode(false, () =>
      program.parseAsync(["node", "skillslink"]),
    );

    const renderedHelp = help.join("");
    expect(renderedHelp).toContain("Usage: skillslink [options] [command]");
    for (const command of [
      "generate",
      "list",
      "open",
      "copy",
      "download",
      "prompt",
      "copy-prompt",
      "remove",
      "config",
      "where",
    ]) {
      expect(renderedHelp).toContain(command);
    }
  });

  it("dispatches the no-command TTY menu and preserves the selected store", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const registryPath = join(directory, "selected-registry.json");
    const { messages, output } = createOutput();
    promptMocks.select.mockResolvedValueOnce("where");

    await withTerminalMode(true, () =>
      createProgram(output, createServices()).parseAsync([
        "node",
        "skillslink",
        "--store",
        registryPath,
      ]),
    );

    expect(promptMocks.select).toHaveBeenCalledOnce();
    expect(promptMocks.select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ value: "generate" }),
          expect.objectContaining({
            label: "Show one registered document",
            value: "list",
          }),
          expect.objectContaining({ value: "open" }),
          expect.objectContaining({ value: "copy" }),
          expect.objectContaining({ value: "download" }),
          expect.objectContaining({ value: "prompt" }),
          expect.objectContaining({ value: "copy-prompt" }),
          expect.objectContaining({ value: "remove" }),
          expect.objectContaining({ value: "config" }),
          expect.objectContaining({ value: "where" }),
        ]),
      }),
    );
    expect(messages).toEqual([resolve(registryPath)]);
  });

  it("generates and registers a Markdown document", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);

    expect(fixture.generationOutput).toContain("AI PROMPT (DIVIDED LINKS)");
    expect(fixture.generationOutput).toContain("Created: 2026-09-06T12:34:56Z");
    expect(fixture.link).toMatchObject({
      name: "guide.md",
      mediaType: "text/markdown",
      createdAt: "2026-09-06T12:34:56.000Z",
    });
    expect(fixture.link.parts.length).toBeGreaterThan(0);
  });

  it("prints only parsable JSON without saving or opening", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const sourcePath = join(directory, "machine-readable.md");
    const registryPath = join(directory, "json-registry.json");
    await writeFile(sourcePath, "# Machine readable\n\nJSON only.", "utf8");
    const openUrl = vi.fn(async () => undefined);
    const services = createServices({ openUrl });
    const jsonOutput = createOutput();

    await withTerminalMode(true, () =>
      createProgram(jsonOutput.output, services).parseAsync([
        "node",
        "skillslink",
        "--store",
        registryPath,
        "generate",
        sourcePath,
        "--json",
      ]),
    );

    expect(jsonOutput.messages).toHaveLength(1);
    expect(JSON.parse(jsonOutput.messages[0] ?? "")).toMatchObject({
      name: "machine-readable.md",
      mediaType: "text/markdown",
    });
    expect(jsonOutput.errors).toEqual([]);
    expect(openUrl).not.toHaveBeenCalled();
    expect(promptMocks.confirm).not.toHaveBeenCalled();
    await expect(access(registryPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("lists one registered link by ID with its divided prompt", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const listOutput = createOutput();

    await createProgram(listOutput.output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "list",
      fixture.link.id,
    ]);

    const renderedList = listOutput.messages.join("\n");
    expect(renderedList).toContain("SELECTED DOCUMENT");
    expect(renderedList).toContain("guide.md");
    expect(renderedList).not.toContain("PARTS (");
    expect(renderedList).toContain("AI PROMPT (DIVIDED)");
  });

  it("selects one registered document by ID in an interactive terminal", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const secondSourcePath = join(directory, "advanced.md");
    await writeFile(
      secondSourcePath,
      "# Advanced\n\nOnly the selected document should be displayed.",
      "utf8",
    );
    await createProgram(createOutput().output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "generate",
      secondSourcePath,
      "--save",
      "--no-open",
    ]);
    const registry = JSON.parse(
      await readFile(fixture.registryPath, "utf8"),
    ) as StoredRegistry;
    const selectedLink = registry.links.find(
      (link) => link.name === "advanced.md",
    );
    expect(selectedLink).toBeDefined();
    if (selectedLink === undefined) {
      throw new Error("Expected advanced.md to be registered.");
    }
    promptMocks.select.mockResolvedValueOnce(selectedLink.id);
    const listOutput = createOutput();

    await withTerminalMode(true, () =>
      createProgram(listOutput.output, services).parseAsync([
        ...fixture.argumentsPrefix,
        "list",
      ]),
    );

    expect(promptMocks.select).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: "Choose a document ID to list",
        options: expect.arrayContaining([
          expect.objectContaining({
            hint: expect.stringContaining(selectedLink.name),
            label: selectedLink.id,
            value: selectedLink.id,
          }),
        ]),
      }),
    );
    const renderedList = listOutput.messages.join("\n");
    expect(renderedList).toContain(`ID: ${selectedLink.id}`);
    expect(renderedList).toContain(selectedLink.name);
    expect(renderedList).not.toContain(`ID: ${fixture.link.id}`);
    expect(renderedList).not.toContain(fixture.link.name);
    expect(renderedList).not.toContain(fixture.link.parts[0]?.url);
    expect(renderedList).toContain("AI PROMPT (DIVIDED)");
    expect(renderedList).toContain(
      "Learn this skill by opening every SkillsLink page URL below in order:",
    );
  });

  it("prints an empty-registry message without opening the list selector", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const registryPath = join(directory, "empty-links.json");
    const listOutput = createOutput();

    await withTerminalMode(true, () =>
      createProgram(listOutput.output, createServices()).parseAsync([
        "node",
        "skillslink",
        "--store",
        registryPath,
        "list",
      ]),
    );

    expect(listOutput.messages).toEqual(["No URLs are registered."]);
    expect(promptMocks.select).not.toHaveBeenCalled();
  });

  it("prints no document when interactive list selection is cancelled", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const listOutput = createOutput();
    promptMocks.select.mockResolvedValueOnce(Symbol("cancelled"));

    await withTerminalMode(true, () =>
      createProgram(listOutput.output, services).parseAsync([
        ...fixture.argumentsPrefix,
        "list",
      ]),
    );

    expect(promptMocks.cancel).toHaveBeenCalledExactlyOnceWith(
      "Command cancelled.",
    );
    expect(listOutput.messages).toEqual([]);
  });

  it("returns complete parent and part URLs from list JSON output", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const listOutput = createOutput();

    await createProgram(listOutput.output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "list",
      "--json",
    ]);

    expect(listOutput.messages).toHaveLength(1);
    const links = JSON.parse(listOutput.messages[0] ?? "") as StoredLink[];
    expect(links).toHaveLength(1);
    expect(links[0]?.url).toBe(fixture.link.url);
    expect(links[0]?.parts.map((part) => part.url)).toEqual(
      fixture.link.parts.map((part) => part.url),
    );

    const selectedJsonOutput = createOutput();
    await withTerminalMode(true, () =>
      createProgram(selectedJsonOutput.output, services).parseAsync([
        ...fixture.argumentsPrefix,
        "list",
        fixture.link.id,
        "--json",
      ]),
    );
    const selectedLinks = JSON.parse(
      selectedJsonOutput.messages[0] ?? "",
    ) as StoredLink[];
    expect(selectedLinks).toHaveLength(1);
    expect(selectedLinks[0]?.id).toBe(fixture.link.id);
    expect(promptMocks.select).not.toHaveBeenCalled();
  });

  it("opens the exact registered document URL", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const openUrl = vi.fn(async () => undefined);
    const services = createServices({ openUrl });
    const fixture = await registerGuide(directory, services);

    await createProgram(createOutput().output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "open",
      fixture.link.id,
    ]);

    expect(openUrl).toHaveBeenCalledExactlyOnceWith(fixture.link.url);
  });

  it("copies the exact registered document URL", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const copyText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const services = createServices({ copyText });
    const fixture = await registerGuide(directory, services);

    await createProgram(createOutput().output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "copy",
      fixture.link.id,
    ]);

    expect(copyText).toHaveBeenCalledExactlyOnceWith(fixture.link.url);
  });

  it("downloads the exact Markdown content from a registered URL", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const destinationDirectory = join(directory, "canonical-download");

    await createProgram(createOutput().output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "download",
      fixture.link.id,
      "--directory",
      destinationDirectory,
    ]);

    await expect(
      readFile(join(destinationDirectory, "guide.md"), "utf8"),
    ).resolves.toBe(fixture.content);
  });

  it("prints the English learning prompt for a registered document", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const promptOutput = createOutput();

    await createProgram(promptOutput.output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "prompt",
      fixture.link.id,
    ]);

    const prompt = promptOutput.messages.join("\n");
    expect(prompt).toContain(
      "Learn this skill by opening every SkillsLink page URL below in order:",
    );
    expect(prompt).toContain(fixture.link.parts[0]?.url);
  });

  it("copies the exact English learning prompt", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const copyText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const services = createServices({ copyText });
    const fixture = await registerGuide(directory, services);
    const promptOutput = createOutput();
    const expectedPrompt = createAiLearningPrompt({
      fullUrl: fixture.link.url,
      partUrls: fixture.link.parts.map((part) => part.url),
    });

    await createProgram(promptOutput.output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "prompt",
      fixture.link.id,
      "--copy",
    ]);

    expect(copyText).toHaveBeenCalledExactlyOnceWith(expectedPrompt);
    expect(promptOutput.messages).toEqual([
      `AI prompt copied: ${fixture.link.name} (${fixture.link.id})`,
    ]);
  });

  it("selects a registered document and copies only its English prompt", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const copyText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    const services = createServices({ copyText });
    const fixture = await registerGuide(directory, services);
    const copyPromptOutput = createOutput();
    const expectedPrompt = createAiLearningPrompt({
      fullUrl: fixture.link.url,
      partUrls: fixture.link.parts.map((part) => part.url),
    });
    promptMocks.select.mockResolvedValueOnce(fixture.link.id);

    await withTerminalMode(true, () =>
      createProgram(copyPromptOutput.output, services).parseAsync([
        ...fixture.argumentsPrefix,
        "copy-prompt",
      ]),
    );

    expect(promptMocks.select).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: "Choose a document ID to copy a prompt for",
        options: expect.arrayContaining([
          expect.objectContaining({
            hint: expect.stringContaining(fixture.link.name),
            label: fixture.link.id,
            value: fixture.link.id,
          }),
        ]),
      }),
    );
    expect(copyText).toHaveBeenCalledExactlyOnceWith(expectedPrompt);
    expect(copyText.mock.calls[0]?.[0]).toContain(
      "Learn this skill by opening every SkillsLink page URL below in order:",
    );
    expect(copyText.mock.calls[0]?.[0]).toContain(fixture.link.parts[0]?.url);
    expect(copyPromptOutput.messages).toEqual([
      `AI prompt copied: ${fixture.link.name} (${fixture.link.id})`,
    ]);

    copyText.mockClear();
    promptMocks.select.mockClear();
    await createProgram(createOutput().output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "copy-prompt",
      fixture.link.id,
    ]);
    expect(promptMocks.select).not.toHaveBeenCalled();
    expect(copyText).toHaveBeenCalledExactlyOnceWith(expectedPrompt);
  });

  it("removes a registered document and all nested parts", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const removeOutput = createOutput();

    await createProgram(removeOutput.output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "remove",
      fixture.link.id,
      "--yes",
    ]);

    expect(removeOutput.messages.join("\n")).toContain("Removed:");
    const registry = JSON.parse(
      await readFile(fixture.registryPath, "utf8"),
    ) as StoredRegistry;
    expect(registry.links).toEqual([]);
  });

  it("updates and prints persistent configuration", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const registryPath = join(directory, "configuration.json");
    const configPath = join(directory, "config.json");
    const configurationOutput = createOutput();

    await createProgram(
      configurationOutput.output,
      createServices(),
    ).parseAsync([
      "node",
      "skillslink",
      "--store",
      registryPath,
      "config",
      "--site-url",
      "https://example.com/tools",
      "--list-mode",
      "all",
    ]);

    const configuration = JSON.parse(
      configurationOutput.messages.join("\n"),
    ) as {
      readonly config: string;
      readonly settings: {
        readonly completeLinks: true;
        readonly dividedLinks: true;
        readonly listDisplayMode: string;
        readonly promptLanguage: "en";
        readonly siteUrl: string;
      };
      readonly store: string;
    };
    expect(configuration).toEqual({
      config: resolve(configPath),
      store: resolve(registryPath),
      settings: {
        completeLinks: true,
        dividedLinks: true,
        listDisplayMode: "all",
        promptLanguage: "en",
        siteUrl: "https://example.com/tools/",
      },
    });
  });

  it("reads persistent configuration when no update option is provided", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const registryPath = join(directory, "read-configuration.json");
    const configPath = join(directory, "config.json");
    const argumentsPrefix = ["node", "skillslink", "--store", registryPath];
    const services = createServices();
    await createProgram(createOutput().output, services).parseAsync([
      ...argumentsPrefix,
      "config",
      "--site-url",
      "https://example.com/persisted",
      "--list-mode",
      "complete",
    ]);
    const configurationOutput = createOutput();

    await createProgram(configurationOutput.output, services).parseAsync([
      ...argumentsPrefix,
      "config",
    ]);

    expect(JSON.parse(configurationOutput.messages.join("\n"))).toEqual({
      config: resolve(configPath),
      store: resolve(registryPath),
      settings: {
        completeLinks: true,
        dividedLinks: true,
        listDisplayMode: "complete",
        promptLanguage: "en",
        siteUrl: "https://example.com/persisted/",
      },
    });
  });

  it("reports an invalid configured site URL as a configuration error", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const registryPath = join(directory, "invalid-configuration.json");

    await expect(
      createProgram(createOutput().output, createServices()).parseAsync([
        "node",
        "skillslink",
        "--store",
        registryPath,
        "config",
        "--site-url",
        "file:///not-a-hosted-viewer",
      ]),
    ).rejects.toMatchObject({
      code: "CONFIGURATION_ERROR",
      name: "CliError",
    });
  });

  it("prints the resolved registry path", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const registryPath = join(directory, "where.json");
    const whereOutput = createOutput();

    await createProgram(whereOutput.output, createServices()).parseAsync([
      "node",
      "skillslink",
      "--store",
      registryPath,
      "where",
    ]);

    expect(whereOutput.messages).toEqual([resolve(registryPath)]);
  });

  it("runs generation, list, download, and removal aliases end to end", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const sourcePath = join(directory, "guide.md");
    const registryPath = join(directory, "registry.json");
    const downloadDirectory = join(directory, "downloads");
    const content = "# Guide\n\nA deterministic command alias test.";
    await writeFile(sourcePath, content, "utf8");

    const services = createServices();
    const argumentsPrefix = ["node", "skillslink", "--store", registryPath];
    const publishOutput = createOutput();
    await createProgram(publishOutput.output, services).parseAsync([
      ...argumentsPrefix,
      "publish",
      sourcePath,
      "--save",
      "--no-open",
    ]);
    expect(publishOutput.messages.join("\n")).toContain("Registered in");

    const createAliasOutput = createOutput();
    await createProgram(createAliasOutput.output, services).parseAsync([
      ...argumentsPrefix,
      "create",
      sourcePath,
      "--json",
      "--no-open",
    ]);
    expect(createAliasOutput.messages.join("\n")).toContain(
      '"name": "guide.md"',
    );

    const listOutput = createOutput();
    await createProgram(listOutput.output, services).parseAsync([
      ...argumentsPrefix,
      "ls",
    ]);
    expect(listOutput.messages.join("\n")).toContain("guide.md");

    const downloadOutput = createOutput();
    await createProgram(downloadOutput.output, services).parseAsync([
      ...argumentsPrefix,
      "get",
      "guide.md",
      "--directory",
      downloadDirectory,
    ]);
    await expect(
      readFile(join(downloadDirectory, "guide.md"), "utf8"),
    ).resolves.toBe(content);
    expect(downloadOutput.messages.join("\n")).toContain("Saved:");

    const removeOutput = createOutput();
    await createProgram(removeOutput.output, services).parseAsync([
      ...argumentsPrefix,
      "rm",
      "guide.md",
      "--yes",
    ]);
    expect(removeOutput.messages.join("\n")).toContain("Removed:");

    const registry = JSON.parse(await readFile(registryPath, "utf8")) as {
      readonly links: readonly unknown[];
    };
    expect(registry.links).toEqual([]);
  });
});

function createOutput(): {
  readonly errors: string[];
  readonly messages: string[];
  readonly output: CliOutput;
} {
  const errors: string[] = [];
  const messages: string[] = [];
  return {
    errors,
    messages,
    output: {
      write: (message) => messages.push(message),
      writeError: (message) => errors.push(message),
    },
  };
}

interface StoredLink {
  readonly createdAt: string;
  readonly id: string;
  readonly mediaType: string;
  readonly name: string;
  readonly parts: readonly { readonly url: string }[];
  readonly url: string;
}

interface StoredRegistry {
  readonly links: readonly StoredLink[];
}

interface RegisteredGuideFixture {
  readonly argumentsPrefix: readonly string[];
  readonly content: string;
  readonly generationOutput: string;
  readonly link: StoredLink;
  readonly registryPath: string;
}

async function registerGuide(
  directory: string,
  services: ProgramServices,
): Promise<RegisteredGuideFixture> {
  const sourcePath = join(directory, "guide.md");
  const registryPath = join(directory, "registry.json");
  const content = "# Guide\n\nA deterministic public command test.";
  const argumentsPrefix = ["node", "skillslink", "--store", registryPath];
  const generationOutput = createOutput();
  await writeFile(sourcePath, content, "utf8");
  await createProgram(generationOutput.output, services).parseAsync([
    ...argumentsPrefix,
    "generate",
    sourcePath,
    "--save",
    "--no-open",
  ]);
  const registry = JSON.parse(
    await readFile(registryPath, "utf8"),
  ) as StoredRegistry;
  const link = registry.links[0];
  if (link === undefined) {
    throw new Error("Expected the generated guide to be registered.");
  }

  return {
    argumentsPrefix,
    content,
    generationOutput: generationOutput.messages.join("\n"),
    link,
    registryPath,
  };
}

function createServices(
  overrides: Partial<Pick<ProgramServices, "copyText" | "openUrl">> = {},
): ProgramServices {
  let identifier = 0;
  return {
    clock: () => new Date("2026-09-06T12:34:56.000Z"),
    identifierGenerator: () => {
      identifier += 1;
      return `00000000-0000-4000-8000-${String(identifier).padStart(12, "0")}`;
    },
    sourceReader: new NodeDocumentSourceReader(),
    documentWriter: new NodeDocumentWriter(),
    openUrl: overrides.openUrl ?? vi.fn(async () => undefined),
    copyText: overrides.copyText ?? vi.fn(async () => undefined),
    storageRuntime: {
      environment: {},
      homeDirectory: TEST_HOME_DIRECTORY,
      legacyRegistryFilePath: join(
        TEST_HOME_DIRECTORY,
        "missing-legacy-registry.json",
      ),
    },
  };
}

async function withTerminalMode<Value>(
  interactive: boolean,
  action: () => Promise<Value>,
): Promise<Value> {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    "isTTY",
  );
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    "isTTY",
  );
  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: interactive,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: interactive,
  });

  try {
    return await action();
  } finally {
    restoreProperty(process.stdin, "isTTY", stdinDescriptor);
    restoreProperty(process.stdout, "isTTY", stdoutDescriptor);
  }
}

function restoreProperty(
  target: NodeJS.ReadStream | NodeJS.WriteStream,
  property: "isTTY",
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor === undefined) {
    Reflect.deleteProperty(target, property);
    return;
  }

  Object.defineProperty(target, property, descriptor);
}
