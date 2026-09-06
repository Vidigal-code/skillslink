import { randomUUID } from "node:crypto";

import {
  createAiLearningPrompt,
  isRecommendedPortableUrl,
  normalizeSiteUrl,
  PORTABLE_LINK_DISPLAY_MODES,
  type PortableLinkDisplayMode,
} from "@skillslink/link-format";
import { Command } from "commander";

import packageMetadata from "../../package.json" with { type: "json" };
import { downloadGeneratedDocument } from "../application/download-generated-document";
import {
  collectRegisteredIdentifiers,
  generateDocumentLink,
} from "../application/generate-document-link";
import type {
  Clock,
  DocumentDestinationWriter,
  DocumentSourceReader,
  IdentifierGenerator,
} from "../application/ports";
import { removeGeneratedLink } from "../application/remove-generated-link";
import {
  resolveDefaultSettings,
  resolveRegistryPath,
} from "../config/runtime-config";
import { CliError } from "../domain/cli-error";
import type {
  RegisteredLinkTarget,
  RegistrySettings,
} from "../domain/registry";
import { JsonRegistry } from "../infrastructure/json-registry";
import {
  DestinationExistsError,
  NodeDocumentWriter,
} from "../infrastructure/node-document-writer";
import { NodeDocumentSourceReader } from "../infrastructure/node-document-source-reader";
import { copyTextToClipboard } from "../infrastructure/system-clipboard";
import { openUrlInDefaultBrowser } from "../infrastructure/system-url-opener";
import {
  askForConfirmation,
  isInteractiveSession,
  resolveDestinationDirectory,
  resolveInteractiveCommand,
  resolveRegisteredDocument,
  resolveRegisteredLink,
  resolveSourcePath,
} from "./interactive";
import {
  formatGeneratedLink,
  formatLinkList,
  standardOutput,
  type CliOutput,
} from "./output";

interface GlobalOptions {
  readonly store?: string;
}

interface GenerateOptions {
  readonly json?: boolean;
  readonly open: boolean;
  readonly save?: boolean;
}

interface ListOptions {
  readonly json?: boolean;
  readonly mode?: string;
}

interface RemoveOptions {
  readonly yes?: boolean;
}

interface DownloadOptions {
  readonly directory?: string;
  readonly overwrite?: boolean;
}

interface PromptOptions {
  readonly copy?: boolean;
}

interface ConfigureOptions {
  readonly listMode?: string;
  readonly siteUrl?: string;
}

export interface ProgramServices {
  readonly clock: Clock;
  readonly identifierGenerator: IdentifierGenerator;
  readonly sourceReader: DocumentSourceReader;
  readonly documentWriter: DocumentDestinationWriter;
  readonly openUrl: (url: string) => Promise<void>;
  readonly copyText: (value: string) => Promise<void>;
}

export function createProgram(
  output: CliOutput = standardOutput,
  services: ProgramServices = createDefaultServices(),
): Command {
  const program = new Command();
  program
    .name("skillslink")
    .description("Read Markdown files and turn them into self-contained URLs.")
    .version(packageMetadata.version)
    .option("-s, --store <file>", "path to the local JSON registry")
    .showHelpAfterError();

  program.action(async (options: GlobalOptions) => {
    if (!isInteractiveSession()) {
      program.outputHelp();
      return;
    }

    const selectedCommand = await resolveInteractiveCommand();
    if (selectedCommand === undefined) {
      return;
    }

    await createProgram(output, services).parseAsync([
      "node",
      "skillslink",
      ...(options.store === undefined ? [] : ["--store", options.store]),
      selectedCommand,
    ]);
  });

  program
    .command("generate [file]")
    .aliases(["publish", "create"])
    .description("read a .md file and generate its URL")
    .option("--json", "print only JSON and disable interactive behavior")
    .option("--save", "register the generated URL without prompting")
    .option("--no-open", "do not open the URL in the default browser")
    .action(
      async (
        filePath: string | undefined,
        options: GenerateOptions,
        command: Command,
      ) => {
        const interactive = isInteractiveSession(options.json === true);
        const sourcePath = await resolveSourcePath(filePath, interactive);
        if (sourcePath === undefined) {
          return;
        }

        const registry = createRegistry(getGlobalOptions(command));
        const current = await registry.read();
        const link = await generateDocumentLink(
          {
            filePath: sourcePath,
            siteUrl: current.settings.siteUrl,
            reservedIds: collectRegisteredIdentifiers(current),
          },
          {
            clock: services.clock,
            identifierGenerator: services.identifierGenerator,
            sourceReader: services.sourceReader,
          },
        );

        output.write(
          options.json === true
            ? JSON.stringify(link, null, 2)
            : formatGeneratedLink(link),
        );

        if (interactive && options.open) {
          const preferredUrl = isRecommendedPortableUrl(link.url)
            ? link.url
            : (link.parts[0]?.url ?? link.url);
          try {
            await services.openUrl(preferredUrl);
          } catch (error) {
            output.writeError(
              error instanceof Error
                ? error.message
                : "Could not open the generated URL.",
            );
          }
        }

        const shouldSave =
          options.save === true ||
          (interactive &&
            (await askForConfirmation(
              "Register this link with its file name and creation time?",
              "Registration skipped.",
              true,
            )));

        if (shouldSave) {
          await registry.upsertLink(link);
          if (options.json !== true) {
            output.write(`Registered in ${registry.filePath}`);
          }
        }
      },
    );

  program
    .command("list")
    .alias("ls")
    .description("show registered links as a compact table")
    .option("--json", "print complete records as JSON")
    .option(
      "--mode <mode>",
      "show divided, complete, or all links (default: configured mode)",
    )
    .action(async (options: ListOptions, command: Command) => {
      const registry = createRegistry(getGlobalOptions(command));
      const { links, settings } = await registry.read();
      output.write(
        options.json === true
          ? JSON.stringify(links, null, 2)
          : formatLinkList(links, {
              mode: parseListDisplayMode(
                options.mode ?? settings.listDisplayMode,
              ),
            }),
      );
    });

  program
    .command("open [id-or-name]")
    .description("open a registered link by ID or file name")
    .action(
      async (
        identifier: string | undefined,
        _options: unknown,
        command: Command,
      ) => {
        const registry = createRegistry(getGlobalOptions(command));
        const link = await resolveRegisteredLink(
          await registry.read(),
          identifier,
          "open",
          isInteractiveSession(),
        );
        if (link === undefined) {
          return;
        }

        await services.openUrl(link.url);
        output.write(`Opened: ${link.name} (${link.id})`);
      },
    );

  program
    .command("copy [id-or-name]")
    .description("copy a registered link by ID or file name")
    .action(
      async (
        identifier: string | undefined,
        _options: unknown,
        command: Command,
      ) => {
        const registry = createRegistry(getGlobalOptions(command));
        const link = await resolveRegisteredLink(
          await registry.read(),
          identifier,
          "copy",
          isInteractiveSession(),
        );
        if (link === undefined) {
          return;
        }

        await services.copyText(link.url);
        output.write(`Copied: ${link.name} (${link.id})`);
      },
    );

  program
    .command("download [id-or-name]")
    .alias("get")
    .description("recover a registered document into a selected directory")
    .option("-d, --directory <path>", "directory for the recovered document")
    .option("--overwrite", "replace an existing document")
    .action(
      async (
        identifier: string | undefined,
        options: DownloadOptions,
        command: Command,
      ) => {
        const interactive = isInteractiveSession();
        const registry = createRegistry(getGlobalOptions(command));
        const link = await resolveRegisteredLink(
          await registry.read(),
          identifier,
          "download",
          interactive,
        );
        if (link === undefined) {
          return;
        }

        const directoryPath = await resolveDestinationDirectory(
          options.directory,
          interactive,
        );
        if (directoryPath === undefined) {
          return;
        }

        const destination = await writeRecoveredDocument({
          link,
          directoryPath,
          overwrite: options.overwrite === true,
          interactive,
          writer: services.documentWriter,
        });
        if (destination !== undefined) {
          output.write(`Saved: ${destination}`);
        }
      },
    );

  program
    .command("prompt [id-or-name]")
    .description("print an English AI learning prompt with registered links")
    .option("--copy", "copy the prompt instead of printing it")
    .action(
      async (
        identifier: string | undefined,
        options: PromptOptions,
        command: Command,
      ) => {
        const registry = createRegistry(getGlobalOptions(command));
        const link = await resolveRegisteredDocument(
          await registry.read(),
          identifier,
          "create a prompt for",
          isInteractiveSession(),
        );
        if (link === undefined) {
          return;
        }

        const prompt = createAiLearningPrompt({
          fullUrl: link.url,
          partUrls: link.parts.map((part) => part.url),
        });
        if (options.copy === true) {
          await services.copyText(prompt);
          output.write(`AI prompt copied: ${link.name} (${link.id})`);
          return;
        }

        output.write(prompt);
      },
    );

  program
    .command("remove [id-or-name]")
    .alias("rm")
    .description("remove a registered link by ID or file name")
    .option("-y, --yes", "remove without interactive confirmation")
    .action(
      async (
        identifier: string | undefined,
        options: RemoveOptions,
        command: Command,
      ) => {
        const interactive = isInteractiveSession();
        const registry = createRegistry(getGlobalOptions(command));
        const link = await resolveRegisteredDocument(
          await registry.read(),
          identifier,
          "remove",
          interactive,
        );
        if (link === undefined) {
          return;
        }

        const shouldRemove =
          options.yes === true ||
          !interactive ||
          (await askForConfirmation(
            `Remove ${link.name} (${link.id}) from the registry?`,
            "Removal cancelled.",
            false,
          ));
        if (!shouldRemove) {
          output.write("Removal skipped.");
          return;
        }

        const removed = await removeGeneratedLink(link.id, registry);
        output.write(`Removed: ${removed.id} (${removed.name})`);
      },
    );

  program
    .command("config")
    .description("read or update persistent configuration")
    .option("--site-url <url>", "base URL of the hosted SkillsLink site")
    .option(
      "--list-mode <mode>",
      "default list mode: divided, complete, or all",
    )
    .action(async (options: ConfigureOptions, command: Command) => {
      const registry = createRegistry(getGlobalOptions(command));
      const updates = createSettingsUpdate(options);
      const value =
        Object.keys(updates).length === 0
          ? await registry.read()
          : await registry.updateSettings(updates);
      output.write(
        JSON.stringify(
          { store: registry.filePath, settings: value.settings },
          null,
          2,
        ),
      );
    });

  program
    .command("where")
    .description("show the path to the JSON registry")
    .action((_options: unknown, command: Command) => {
      output.write(createRegistry(getGlobalOptions(command)).filePath);
    });

  return program;
}

interface WriteRecoveredDocumentInput {
  readonly link: RegisteredLinkTarget;
  readonly directoryPath: string;
  readonly overwrite: boolean;
  readonly interactive: boolean;
  readonly writer: DocumentDestinationWriter;
}

async function writeRecoveredDocument(
  input: WriteRecoveredDocumentInput,
): Promise<string | undefined> {
  try {
    return await downloadGeneratedDocument(
      {
        link: input.link,
        directoryPath: input.directoryPath,
        overwrite: input.overwrite,
      },
      input.writer,
    );
  } catch (error) {
    if (!(error instanceof DestinationExistsError) || input.overwrite) {
      throw error;
    }

    if (!input.interactive) {
      throw error;
    }

    const shouldOverwrite = await askForConfirmation(
      `${error.destinationPath} already exists. Replace it?`,
      "Download cancelled.",
      false,
    );
    if (!shouldOverwrite) {
      return undefined;
    }

    return downloadGeneratedDocument(
      {
        link: input.link,
        directoryPath: input.directoryPath,
        overwrite: true,
      },
      input.writer,
    );
  }
}

function createDefaultServices(): ProgramServices {
  return {
    clock: () => new Date(),
    identifierGenerator: randomUUID,
    sourceReader: new NodeDocumentSourceReader(),
    documentWriter: new NodeDocumentWriter(),
    openUrl: openUrlInDefaultBrowser,
    copyText: copyTextToClipboard,
  };
}

function createRegistry(options: GlobalOptions): JsonRegistry {
  return new JsonRegistry({
    filePath: resolveRegistryPath(options.store),
    defaults: resolveDefaultSettings(),
  });
}

function getGlobalOptions(command: Command): GlobalOptions {
  return command.optsWithGlobals<GlobalOptions>();
}

function createSettingsUpdate(
  options: ConfigureOptions,
): Partial<RegistrySettings> {
  return {
    ...(options.listMode === undefined
      ? {}
      : { listDisplayMode: parseListDisplayMode(options.listMode) }),
    ...(options.siteUrl === undefined
      ? {}
      : { siteUrl: normalizeSiteUrl(options.siteUrl) }),
  };
}

function parseListDisplayMode(value: string): PortableLinkDisplayMode {
  const mode = PORTABLE_LINK_DISPLAY_MODES.find((item) => item === value);
  if (mode === undefined) {
    throw new CliError(
      "CONFIGURATION_ERROR",
      `Invalid list mode ${value}. Use ${PORTABLE_LINK_DISPLAY_MODES.join(", ")}.`,
    );
  }
  return mode;
}
