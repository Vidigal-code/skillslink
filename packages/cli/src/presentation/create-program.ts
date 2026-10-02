import { randomUUID } from "node:crypto";

import { Command } from "commander";

import packageMetadata from "../../package.json" with { type: "json" };
import { NodeDocumentWriter } from "../infrastructure/node-document-writer";
import { NodeDocumentSourceReader } from "../infrastructure/node-document-source-reader";
import { copyTextToClipboard } from "../infrastructure/system-clipboard";
import { openUrlInDefaultBrowser } from "../infrastructure/system-url-opener";
import {
  openCommandStorage,
  type CommandContext,
  type OptionsAction,
  type ProgramServices,
} from "./command-context";
import { createGenerateAction } from "./commands/generate-command";
import { createListAction } from "./commands/list-command";
import {
  createCopyPromptAction,
  createPromptAction,
} from "./commands/prompt-commands";
import {
  COPY_LINK,
  createDownloadAction,
  createLinkDeliveryAction,
  createRemoveAction,
  OPEN_LINK,
} from "./commands/registered-link-commands";
import {
  createConfigAction,
  createWhereAction,
} from "./commands/settings-commands";
import type { StorageSelectors } from "./create-storage-session";
import { isInteractiveSession, resolveInteractiveCommand } from "./interactive";
import { standardOutput, type CliOutput } from "./output";

export type { ProgramServices } from "./command-context";

export function createProgram(
  output: CliOutput = standardOutput,
  services: ProgramServices = createDefaultServices(),
): Command {
  const context: CommandContext = { output, services };
  const program = new Command();
  program
    .name("skillslink")
    .description("Read Markdown files and turn them into self-contained URLs.")
    .version(packageMetadata.version)
    .option("-c, --config <file>", "path to the CLI configuration file")
    .option("-s, --store <file>", "path to the links.json link store")
    .showHelpAfterError()
    .action(createDefaultAction(context));

  program
    .command("generate [file]")
    .aliases(["publish", "create"])
    .description("read a .md file and generate its URL")
    .option("--json", "print only JSON and disable interactive behavior")
    .option("--save", "register the generated URL without prompting")
    .option("--no-open", "do not open the URL in the default browser")
    .action(createGenerateAction(context));

  program
    .command("list [id-or-name]")
    .alias("ls")
    .description("select and show one registered document")
    .option("--json", "print complete records as JSON")
    .option(
      "--mode <mode>",
      "show divided, complete, or all links (default: configured mode)",
    )
    .action(createListAction(context));

  program
    .command("open [id-or-name]")
    .description("open a registered link by ID or file name")
    .action(createLinkDeliveryAction(context, OPEN_LINK));

  program
    .command("copy [id-or-name]")
    .description("copy a registered link by ID or file name")
    .action(createLinkDeliveryAction(context, COPY_LINK));

  program
    .command("download [id-or-name]")
    .alias("get")
    .description("recover a registered document into a selected directory")
    .option("-d, --directory <path>", "directory for the recovered document")
    .option("--overwrite", "replace an existing document")
    .action(createDownloadAction(context));

  program
    .command("prompt [id-or-name]")
    .description("print an English AI learning prompt with registered links")
    .option("--copy", "copy the prompt instead of printing it")
    .action(createPromptAction(context));

  program
    .command("copy-prompt [id-or-name]")
    .description("select a document and copy only its English AI prompt")
    .action(createCopyPromptAction(context));

  program
    .command("remove [id-or-name]")
    .alias("rm")
    .description("remove a registered link by ID or file name")
    .option("-y, --yes", "remove without interactive confirmation")
    .action(createRemoveAction(context));

  program
    .command("config")
    .description("read or update persistent configuration")
    .option("--site-url <url>", "base URL of the hosted SkillsLink site")
    .option(
      "--list-mode <mode>",
      "default list mode: divided, complete, or all",
    )
    .action(createConfigAction(context));

  program
    .command("where")
    .description("show the path to the links.json link store")
    .action(createWhereAction(context));

  return program;
}

function createDefaultAction(
  context: CommandContext,
): OptionsAction<StorageSelectors> {
  return async (options, command) => {
    if (!isInteractiveSession()) {
      command.outputHelp();
      return;
    }

    const storage = await openCommandStorage(context, {
      command,
      interactive: true,
    });
    if (storage === undefined) {
      return;
    }

    const selectedCommand = await resolveInteractiveCommand();
    if (selectedCommand === undefined) {
      return;
    }

    await createProgram(context.output, context.services).parseAsync([
      "node",
      "skillslink",
      "--config",
      storage.configFilePath,
      ...(options.store === undefined ? [] : ["--store", options.store]),
      selectedCommand,
    ]);
  };
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
