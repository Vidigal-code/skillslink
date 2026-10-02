import {
  LinkFormatError,
  normalizeSiteUrl,
  PORTABLE_LINK_DISPLAY_MODES,
  type PortableLinkDisplayMode,
} from "@skillslink/link-format";

import type { RegistryRepository } from "../../application/ports";
import { CliError } from "../../domain/cli-error";
import type { LinkRegistry, RegistrySettings } from "../../domain/registry";
import {
  formatJson,
  openCommandStorage,
  type CommandContext,
  type OptionsAction,
} from "../command-context";
import { isInteractiveSession } from "../interactive";

export interface ConfigureOptions {
  readonly listMode?: string;
  readonly siteUrl?: string;
}

export function createConfigAction(
  context: CommandContext,
): OptionsAction<ConfigureOptions> {
  return async (options, command) => {
    const storage = await openCommandStorage(context, {
      command,
      interactive: isInteractiveSession(),
    });
    if (storage === undefined) {
      return;
    }

    const registry = await applySettingsUpdate(
      storage.registry,
      createSettingsUpdate(options),
    );
    const configuration = await storage.configuration.read();
    context.output.write(
      formatJson({
        config: storage.configFilePath,
        store: storage.registry.filePath,
        settings: {
          ...configuration.settings,
          ...registry.settings,
        },
      }),
    );
  };
}

export function createWhereAction(
  context: CommandContext,
): OptionsAction<unknown> {
  return async (_options, command) => {
    const storage = await openCommandStorage(context, {
      command,
      interactive: isInteractiveSession(),
    });
    if (storage !== undefined) {
      context.output.write(storage.registry.filePath);
    }
  };
}

export function parseListDisplayMode(value: string): PortableLinkDisplayMode {
  const mode = PORTABLE_LINK_DISPLAY_MODES.find((item) => item === value);
  if (mode === undefined) {
    throw new CliError(
      "CONFIGURATION_ERROR",
      `Invalid list mode ${value}. Use ${PORTABLE_LINK_DISPLAY_MODES.join(", ")}.`,
    );
  }
  return mode;
}

async function applySettingsUpdate(
  registry: RegistryRepository,
  updates: Partial<RegistrySettings>,
): Promise<LinkRegistry> {
  const current = await registry.read();
  return Object.keys(updates).length === 0
    ? current
    : registry.updateSettings(updates);
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
      : { siteUrl: parseSiteUrl(options.siteUrl) }),
  };
}

function parseSiteUrl(value: string): string {
  try {
    return normalizeSiteUrl(value);
  } catch (error) {
    if (error instanceof LinkFormatError) {
      throw new CliError("CONFIGURATION_ERROR", error.message, {
        cause: error,
      });
    }

    throw error;
  }
}
