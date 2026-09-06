import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveDefaultStoragePaths } from "../src/config/runtime-config";
import { NodeDocumentSourceReader } from "../src/infrastructure/node-document-source-reader";
import { NodeDocumentWriter } from "../src/infrastructure/node-document-writer";
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
}));

vi.mock("@clack/prompts", () => ({
  ...promptMocks,
  isCancel: (value: unknown) => typeof value === "symbol",
}));

describe("initial CLI storage setup", () => {
  const directories: string[] = [];

  afterEach(async () => {
    promptMocks.cancel.mockReset();
    promptMocks.confirm.mockReset();
    promptMocks.path.mockReset();
    promptMocks.select.mockReset();
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it("writes default config.json and links.json with portable settings", async () => {
    const homeDirectory = await createHomeDirectory(directories);
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    promptMocks.path
      .mockResolvedValueOnce(defaults.configFilePath)
      .mockResolvedValueOnce(defaults.linksFilePath);
    const cliOutput = createOutput();

    await withTerminalMode(true, () =>
      createProgram(cliOutput.output, createServices(homeDirectory)).parseAsync(
        ["node", "skillslink", "where"],
      ),
    );

    const configuration = JSON.parse(
      await readFile(defaults.configFilePath, "utf8"),
    ) as Record<string, unknown>;
    const linkStore = JSON.parse(
      await readFile(defaults.linksFilePath, "utf8"),
    ) as Record<string, unknown>;
    expect(configuration).toMatchObject({
      kind: "skillslink-config",
      schemaVersion: 1,
      linksFile: defaults.linksFilePath,
      settings: {
        completeLinks: true,
        dividedLinks: true,
        promptLanguage: "en",
      },
    });
    expect(linkStore).toEqual({
      kind: "skillslink-links",
      schemaVersion: 1,
      links: [],
    });
    expect(promptMocks.path).toHaveBeenCalledTimes(2);
    const configPrompt = promptMocks.path.mock.calls[0]?.[0] as {
      readonly validate: (value: string) => string | undefined;
    };
    const linksPrompt = promptMocks.path.mock.calls[1]?.[0] as {
      readonly validate: (value: string) => string | undefined;
    };
    expect(configPrompt.validate("settings.txt")).toBe(
      "Choose a file ending in .json.",
    );
    expect(linksPrompt.validate(defaults.configFilePath)).toBe(
      "config.json and links.json must use different paths.",
    );
    expect(cliOutput.messages.at(-1)).toBe(defaults.linksFilePath);
    await expect(access(defaults.configLocationFilePath)).rejects.toMatchObject(
      {
        code: "ENOENT",
      },
    );
  });

  it("persists and rediscovers a custom configuration path", async () => {
    const homeDirectory = await createHomeDirectory(directories);
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    const customDirectory = join(homeDirectory, "custom-storage");
    const customConfigPath = join(customDirectory, "config.json");
    const customLinksPath = join(customDirectory, "links.json");
    promptMocks.path
      .mockResolvedValueOnce(customConfigPath)
      .mockResolvedValueOnce(customLinksPath);

    await withTerminalMode(true, () =>
      createProgram(
        createOutput().output,
        createServices(homeDirectory),
      ).parseAsync(["node", "skillslink", "where"]),
    );

    expect(
      JSON.parse(await readFile(defaults.configLocationFilePath, "utf8")),
    ).toEqual({
      kind: "skillslink-config-location",
      schemaVersion: 1,
      configFile: resolve(customConfigPath),
    });
    promptMocks.path.mockClear();
    const rediscoveredOutput = createOutput();
    await withTerminalMode(false, () =>
      createProgram(
        rediscoveredOutput.output,
        createServices(homeDirectory),
      ).parseAsync(["node", "skillslink", "where"]),
    );

    expect(rediscoveredOutput.messages).toEqual([resolve(customLinksPath)]);
    expect(promptMocks.path).not.toHaveBeenCalled();
    await expect(access(customConfigPath)).resolves.toBeUndefined();
    await expect(access(customLinksPath)).resolves.toBeUndefined();
  });

  it("writes no storage files when initial setup is cancelled", async () => {
    const homeDirectory = await createHomeDirectory(directories);
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    promptMocks.path
      .mockResolvedValueOnce(defaults.configFilePath)
      .mockResolvedValueOnce(Symbol("cancelled"));
    const cliOutput = createOutput();

    await withTerminalMode(true, () =>
      createProgram(cliOutput.output, createServices(homeDirectory)).parseAsync(
        ["node", "skillslink", "where"],
      ),
    );

    expect(promptMocks.path).toHaveBeenCalledTimes(2);
    expect(promptMocks.cancel).toHaveBeenCalledExactlyOnceWith(
      "Initial setup cancelled.",
    );
    expect(cliOutput.messages).toEqual([]);
    await expectStorageFilesNotToExist(defaults);
  });

  it("writes no storage files when setup is cancelled at the first path", async () => {
    const homeDirectory = await createHomeDirectory(directories);
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    promptMocks.path.mockResolvedValueOnce(Symbol("cancelled"));

    await withTerminalMode(true, () =>
      createProgram(
        createOutput().output,
        createServices(homeDirectory),
      ).parseAsync(["node", "skillslink", "where"]),
    );

    expect(promptMocks.path).toHaveBeenCalledOnce();
    expect(promptMocks.cancel).toHaveBeenCalledExactlyOnceWith(
      "Initial setup cancelled.",
    );
    await expectStorageFilesNotToExist(defaults);
  });

  it("does not prompt or write storage files in a non-interactive read", async () => {
    const homeDirectory = await createHomeDirectory(directories);
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    const cliOutput = createOutput();

    await withTerminalMode(false, () =>
      createProgram(cliOutput.output, createServices(homeDirectory)).parseAsync(
        ["node", "skillslink", "where"],
      ),
    );

    expect(cliOutput.messages).toEqual([defaults.linksFilePath]);
    expectNoPromptCalls();
    await expectStorageFilesNotToExist(defaults);
  });

  it("does not prompt or initialize storage for JSON commands in a TTY", async () => {
    const homeDirectory = await createHomeDirectory(directories);
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    const sourcePath = join(homeDirectory, "guide.md");
    await writeFile(sourcePath, "# Guide\n\nJSON output only.\n", "utf8");
    const listOutput = createOutput();
    const generateOutput = createOutput();
    const services = createServices(homeDirectory);

    await withTerminalMode(true, async () => {
      await createProgram(listOutput.output, services).parseAsync([
        "node",
        "skillslink",
        "list",
        "--json",
      ]);
      await createProgram(generateOutput.output, services).parseAsync([
        "node",
        "skillslink",
        "generate",
        sourcePath,
        "--json",
      ]);
    });

    expect(JSON.parse(listOutput.messages[0] ?? "invalid")).toEqual([]);
    expect(JSON.parse(generateOutput.messages[0] ?? "invalid")).toMatchObject({
      name: "guide.md",
      mediaType: "text/markdown",
    });
    expectNoPromptCalls();
    await expectStorageFilesNotToExist(defaults);
  });

  it("prefers an existing default links file over a stale legacy registry", async () => {
    const homeDirectory = await createHomeDirectory(directories);
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    const legacyRegistryFilePath = join(homeDirectory, "legacy-registry.json");
    await mkdir(join(homeDirectory, ".skillslink"));
    await writeFile(defaults.linksFilePath, "{}", "utf8");
    await writeFile(legacyRegistryFilePath, "{}", "utf8");
    const cliOutput = createOutput();

    await withTerminalMode(false, () =>
      createProgram(
        cliOutput.output,
        createServices(homeDirectory, legacyRegistryFilePath),
      ).parseAsync(["node", "skillslink", "where"]),
    );

    expect(cliOutput.messages).toEqual([defaults.linksFilePath]);
    expectNoPromptCalls();
  });

  it("uses the sibling links file when a located custom config is missing", async () => {
    const homeDirectory = await createHomeDirectory(directories);
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    const customConfigPath = join(homeDirectory, "custom", "config.json");
    const customLinksPath = join(homeDirectory, "custom", "links.json");
    await mkdir(dirname(defaults.configLocationFilePath), { recursive: true });
    await writeFile(
      defaults.configLocationFilePath,
      JSON.stringify({
        kind: "skillslink-config-location",
        schemaVersion: 1,
        configFile: resolve(customConfigPath),
      }),
      "utf8",
    );
    const cliOutput = createOutput();

    await withTerminalMode(false, () =>
      createProgram(cliOutput.output, createServices(homeDirectory)).parseAsync(
        ["node", "skillslink", "where"],
      ),
    );

    expect(cliOutput.messages).toEqual([resolve(customLinksPath)]);
    expectNoPromptCalls();
  });
});

async function createHomeDirectory(directories: string[]): Promise<string> {
  const directory = await createTemporaryDirectory();
  directories.push(directory);
  return directory;
}

function createServices(
  homeDirectory: string,
  legacyRegistryFilePath = join(homeDirectory, "missing-legacy-registry.json"),
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
    openUrl: vi.fn(async () => undefined),
    copyText: vi.fn(async () => undefined),
    storageRuntime: {
      environment: {},
      homeDirectory,
      legacyRegistryFilePath,
    },
  };
}

function createOutput(): {
  readonly messages: string[];
  readonly output: CliOutput;
} {
  const messages: string[] = [];
  return {
    messages,
    output: {
      write: (message) => messages.push(message),
      writeError: vi.fn(),
    },
  };
}

function expectNoPromptCalls(): void {
  expect(promptMocks.path).not.toHaveBeenCalled();
  expect(promptMocks.confirm).not.toHaveBeenCalled();
  expect(promptMocks.select).not.toHaveBeenCalled();
  expect(promptMocks.cancel).not.toHaveBeenCalled();
}

async function expectStorageFilesNotToExist(
  paths: ReturnType<typeof resolveDefaultStoragePaths>,
): Promise<void> {
  await Promise.all(
    [
      paths.configFilePath,
      paths.linksFilePath,
      paths.configLocationFilePath,
    ].map(async (filePath) => {
      await expect(access(filePath)).rejects.toMatchObject({ code: "ENOENT" });
    }),
  );
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
