import { downloadGeneratedDocument } from "../../application/download-generated-document";
import type { DocumentDestinationWriter } from "../../application/ports";
import { removeGeneratedLink } from "../../application/remove-generated-link";
import type { RegisteredLinkTarget } from "../../domain/registry";
import { DestinationExistsError } from "../../infrastructure/node-document-writer";
import {
  resolveCommandTarget,
  type ArgumentAction,
  type CommandContext,
  type ProgramServices,
} from "../command-context";
import {
  askForConfirmation,
  isInteractiveSession,
  resolveDestinationDirectory,
  resolveRegisteredDocument,
  resolveRegisteredLink,
  type RegisteredTargetAction,
} from "../interactive";

export interface DownloadOptions {
  readonly directory?: string;
  readonly overwrite?: boolean;
}

export interface RemoveOptions {
  readonly yes?: boolean;
}

export interface LinkDelivery {
  readonly action: RegisteredTargetAction;
  readonly outcome: string;
  deliver(services: ProgramServices, url: string): Promise<void>;
}

export const OPEN_LINK: LinkDelivery = {
  action: "open",
  outcome: "Opened",
  deliver: (services, url) => services.openUrl(url),
};

export const COPY_LINK: LinkDelivery = {
  action: "copy",
  outcome: "Copied",
  deliver: (services, url) => services.copyText(url),
};

interface WriteRecoveredDocumentInput {
  readonly link: RegisteredLinkTarget;
  readonly directoryPath: string;
  readonly overwrite: boolean;
  readonly interactive: boolean;
  readonly writer: DocumentDestinationWriter;
}

export function createLinkDeliveryAction(
  context: CommandContext,
  delivery: LinkDelivery,
): ArgumentAction<unknown> {
  return async (identifier, _options, command) => {
    const resolved = await resolveCommandTarget(
      context,
      {
        identifier,
        command,
        action: delivery.action,
        interactive: isInteractiveSession(),
      },
      resolveRegisteredLink,
    );
    if (resolved === undefined) {
      return;
    }

    const link = resolved.target;
    await delivery.deliver(context.services, link.url);
    context.output.write(`${delivery.outcome}: ${link.name} (${link.id})`);
  };
}

export function createDownloadAction(
  context: CommandContext,
): ArgumentAction<DownloadOptions> {
  return async (identifier, options, command) => {
    const interactive = isInteractiveSession();
    const resolved = await resolveCommandTarget(
      context,
      { identifier, command, action: "download", interactive },
      resolveRegisteredLink,
    );
    if (resolved === undefined) {
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
      link: resolved.target,
      directoryPath,
      overwrite: options.overwrite === true,
      interactive,
      writer: context.services.documentWriter,
    });
    if (destination !== undefined) {
      context.output.write(`Saved: ${destination}`);
    }
  };
}

export function createRemoveAction(
  context: CommandContext,
): ArgumentAction<RemoveOptions> {
  return async (identifier, options, command) => {
    const interactive = isInteractiveSession();
    const resolved = await resolveCommandTarget(
      context,
      { identifier, command, action: "remove", interactive },
      resolveRegisteredDocument,
    );
    if (resolved === undefined) {
      return;
    }

    const { storage, target: link } = resolved;
    const shouldRemove =
      options.yes === true ||
      !interactive ||
      (await askForConfirmation({
        message: `Remove ${link.name} (${link.id}) from the registry?`,
        cancellationMessage: "Removal cancelled.",
        initialValue: false,
      }));
    if (!shouldRemove) {
      context.output.write("Removal skipped.");
      return;
    }

    const removed = await removeGeneratedLink(link.id, storage.registry);
    context.output.write(`Removed: ${removed.id} (${removed.name})`);
  };
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
    if (
      !(error instanceof DestinationExistsError) ||
      input.overwrite ||
      !input.interactive
    ) {
      throw error;
    }

    const shouldOverwrite = await askForConfirmation({
      message: `${error.destinationPath} already exists. Replace it?`,
      cancellationMessage: "Download cancelled.",
      initialValue: false,
    });
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
