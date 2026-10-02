import { isRecommendedPortableUrl } from "@skillslink/link-format";

import {
  collectRegisteredIdentifiers,
  generateDocumentLink,
} from "../../application/generate-document-link";
import type { RegistryRepository } from "../../application/ports";
import type { GeneratedLink } from "../../domain/registry";
import {
  formatJson,
  openCommandStorage,
  type ArgumentAction,
  type CommandContext,
  type ProgramServices,
} from "../command-context";
import {
  askForConfirmation,
  isInteractiveSession,
  resolveSourcePath,
  type ConfirmationPrompt,
} from "../interactive";
import { formatGeneratedLink } from "../output";

export interface GenerateOptions {
  readonly json?: boolean;
  readonly open: boolean;
  readonly save?: boolean;
}

const REGISTRATION_PROMPT: ConfirmationPrompt = {
  message: "Register this link with its file name and creation time?",
  cancellationMessage: "Registration skipped.",
  initialValue: true,
};

export function createGenerateAction(
  context: CommandContext,
): ArgumentAction<GenerateOptions> {
  return async (filePath, options, command) => {
    const jsonOutput = options.json === true;
    const interactive = !jsonOutput && isInteractiveSession();
    const storage = await openCommandStorage(context, { command, interactive });
    if (storage === undefined) {
      return;
    }
    const sourcePath = await resolveSourcePath(filePath, interactive);
    if (sourcePath === undefined) {
      return;
    }

    const link = await generateRegistryLink(
      context.services,
      storage.registry,
      sourcePath,
    );
    context.output.write(
      jsonOutput ? formatJson(link) : formatGeneratedLink(link),
    );

    if (interactive && options.open) {
      await openGeneratedLink(context, link);
    }

    const shouldRegister =
      options.save === true ||
      (interactive && (await askForConfirmation(REGISTRATION_PROMPT)));
    if (shouldRegister) {
      await storage.registry.upsertLink(link);
      if (!jsonOutput) {
        context.output.write(`Registered in ${storage.registry.filePath}`);
      }
    }
  };
}

async function generateRegistryLink(
  services: ProgramServices,
  registry: RegistryRepository,
  filePath: string,
): Promise<GeneratedLink> {
  const current = await registry.read();
  return generateDocumentLink(
    {
      filePath,
      siteUrl: current.settings.siteUrl,
      reservedIds: collectRegisteredIdentifiers(current),
    },
    {
      clock: services.clock,
      identifierGenerator: services.identifierGenerator,
      sourceReader: services.sourceReader,
    },
  );
}

async function openGeneratedLink(
  context: CommandContext,
  link: GeneratedLink,
): Promise<void> {
  const preferredUrl = isRecommendedPortableUrl(link.url)
    ? link.url
    : (link.parts[0]?.url ?? link.url);
  try {
    await context.services.openUrl(preferredUrl);
  } catch (error) {
    context.output.writeError(
      error instanceof Error
        ? error.message
        : "Could not open the generated URL.",
    );
  }
}
