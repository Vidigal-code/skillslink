import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { LinkRegistry } from "../src/domain/registry";
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

describe("registered target commands", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it("opens a nested part by UUID and copies a nested part by title", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const openUrl = vi.fn(async () => undefined);
    const copyText = vi.fn(async () => undefined);
    const services = createServices({ copyText, openUrl });
    const fixture = await registerGuide(directory, services);
    const firstPart = fixture.registry.links[0]?.parts[0];
    const secondPart = fixture.registry.links[0]?.parts[1];

    expect(firstPart).toBeDefined();
    expect(secondPart).toBeDefined();
    if (firstPart === undefined || secondPart === undefined) {
      throw new Error("Expected the guide fixture to create two nested parts.");
    }

    await createProgram(createOutput().output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "open",
      firstPart.id,
    ]);
    await createProgram(createOutput().output, services).parseAsync([
      ...fixture.argumentsPrefix,
      "copy",
      secondPart.title,
    ]);

    expect(openUrl).toHaveBeenCalledExactlyOnceWith(firstPart.url);
    expect(copyText).toHaveBeenCalledExactlyOnceWith(secondPart.url);
  });

  it("requires --overwrite for an existing destination outside a TTY", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const document = fixture.registry.links[0];
    const destinationDirectory = join(directory, "downloads");
    const destinationPath = join(destinationDirectory, "guide.md");
    const existingContent = "# Existing document\n";

    expect(document).toBeDefined();
    if (document === undefined) {
      throw new Error("Expected the guide fixture to contain a document.");
    }
    await mkdir(destinationDirectory, { recursive: true });
    await writeFile(destinationPath, existingContent, "utf8");

    await expect(
      withTerminalMode(false, () =>
        createProgram(createOutput().output, services).parseAsync([
          ...fixture.argumentsPrefix,
          "download",
          document.id,
          "--directory",
          destinationDirectory,
        ]),
      ),
    ).rejects.toMatchObject({
      code: "DOCUMENT_ERROR",
      destinationPath: resolve(destinationPath),
      name: "DestinationExistsError",
    });
    await expect(readFile(destinationPath, "utf8")).resolves.toBe(
      existingContent,
    );

    await withTerminalMode(false, () =>
      createProgram(createOutput().output, services).parseAsync([
        ...fixture.argumentsPrefix,
        "download",
        document.id,
        "--directory",
        destinationDirectory,
        "--overwrite",
      ]),
    );

    await expect(readFile(destinationPath, "utf8")).resolves.toBe(
      fixture.content,
    );
  });

  it("removes a document outside a TTY without requiring --yes", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const services = createServices();
    const fixture = await registerGuide(directory, services);
    const document = fixture.registry.links[0];
    const removeOutput = createOutput();

    expect(document).toBeDefined();
    if (document === undefined) {
      throw new Error("Expected the guide fixture to contain a document.");
    }
    await withTerminalMode(false, () =>
      createProgram(removeOutput.output, services).parseAsync([
        ...fixture.argumentsPrefix,
        "remove",
        document.id,
      ]),
    );

    expect(removeOutput.messages).toEqual([
      `Removed: ${document.id} (${document.name})`,
    ]);
    const storedRegistry = JSON.parse(
      await readFile(fixture.registryPath, "utf8"),
    ) as LinkRegistry;
    expect(storedRegistry.links).toEqual([]);
  });
});

interface RegisteredGuideFixture {
  readonly argumentsPrefix: readonly string[];
  readonly content: string;
  readonly registry: LinkRegistry;
  readonly registryPath: string;
}

async function registerGuide(
  directory: string,
  services: ProgramServices,
): Promise<RegisteredGuideFixture> {
  const sourcePath = join(directory, "guide.md");
  const registryPath = join(directory, "registry.json");
  const content = "# Installation\n\nRun `npm install`.\n";
  const argumentsPrefix = ["node", "skillslink", "--store", registryPath];
  await writeFile(sourcePath, content, "utf8");
  await createProgram(createOutput().output, services).parseAsync([
    ...argumentsPrefix,
    "generate",
    sourcePath,
    "--save",
    "--no-open",
  ]);

  return {
    argumentsPrefix,
    content,
    registry: JSON.parse(await readFile(registryPath, "utf8")) as LinkRegistry,
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
