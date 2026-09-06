import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import {
  CONFIGURATION_FILE_NAME,
  createDefaultConfiguration,
  LINKS_FILE_NAME,
  normalizePathForComparison,
  resolveConfigurationOverride,
  resolveDefaultStoragePaths,
  resolveDefaultSettings,
  resolveLegacyRegistryPath,
  resolveRegistryOverride,
} from "../config/runtime-config";
import { CliError } from "../domain/cli-error";
import type { CliConfiguration } from "../domain/configuration";
import { JsonConfigurationLocation } from "../infrastructure/json-configuration-location";
import { JsonConfiguration } from "../infrastructure/json-configuration";
import { JsonRegistry } from "../infrastructure/json-registry";
import { resolveInitialStoragePaths } from "./interactive";
import type { CliOutput } from "./output";

export interface StorageSelectors {
  readonly config?: string;
  readonly store?: string;
}

export interface StorageRuntime {
  readonly environment?: NodeJS.ProcessEnv;
  readonly homeDirectory?: string;
  readonly legacyRegistryFilePath?: string;
}

export interface StorageSession {
  readonly configuration: JsonConfiguration;
  readonly configFilePath: string;
  readonly registry: JsonRegistry;
}

export async function createStorageSession(
  selectors: StorageSelectors,
  options: {
    readonly interactive: boolean;
    readonly output: CliOutput;
    readonly runtime?: StorageRuntime;
  },
): Promise<StorageSession | undefined> {
  const environment = options.runtime?.environment ?? process.env;
  const defaults = resolveDefaultStoragePaths(
    options.runtime?.homeDirectory ?? homedir(),
  );
  const configOverride = resolveConfigurationOverride(
    selectors.config,
    environment,
  );
  const linksOverride = resolveRegistryOverride(selectors.store, environment);
  const location = new JsonConfigurationLocation(
    defaults.configLocationFilePath,
  );
  const locatedConfigFile =
    configOverride === undefined ? await location.read() : undefined;
  let configFilePath =
    configOverride ?? locatedConfigFile ?? defaults.configFilePath;
  let implicitLinksFilePath =
    locatedConfigFile === undefined
      ? defaults.linksFilePath
      : join(dirname(locatedConfigFile), LINKS_FILE_NAME);
  let configuration = createConfiguration(
    configFilePath,
    linksOverride ?? implicitLinksFilePath,
  );
  let configurationExists = await configuration.exists();
  if (
    !configurationExists &&
    configOverride === undefined &&
    locatedConfigFile === undefined &&
    linksOverride !== undefined
  ) {
    configFilePath = join(dirname(linksOverride), CONFIGURATION_FILE_NAME);
    configuration = createConfiguration(configFilePath, linksOverride);
    configurationExists = await configuration.exists();
  }
  if (
    !configurationExists &&
    configOverride === undefined &&
    locatedConfigFile === undefined &&
    linksOverride === undefined
  ) {
    const defaultLinksExist = await fileExists(defaults.linksFilePath);
    if (!defaultLinksExist) {
      const legacyRegistryFilePath =
        options.runtime?.legacyRegistryFilePath ?? resolveLegacyRegistryPath();
      if (await fileExists(legacyRegistryFilePath)) {
        implicitLinksFilePath = legacyRegistryFilePath;
      }
    }
  }
  if (!configurationExists) {
    configuration = createConfiguration(
      configFilePath,
      linksOverride ?? implicitLinksFilePath,
    );
  }

  if (
    options.interactive &&
    !configurationExists &&
    configOverride === undefined &&
    linksOverride === undefined
  ) {
    const selected = await resolveInitialStoragePaths({
      configFilePath,
      linksFilePath: implicitLinksFilePath,
    });
    if (selected === undefined) {
      return undefined;
    }
    assertStoragePathsAreDistinct(
      selected.configFilePath,
      selected.linksFilePath,
      defaults.configLocationFilePath,
    );

    configuration = createConfiguration(
      selected.configFilePath,
      selected.linksFilePath,
    );
    const registry = createRegistry({
      configuration,
      linksFilePath: selected.linksFilePath,
      environment,
      persistConfigurationOnWrite: true,
    });
    const selectedConfigurationExists = await configuration.exists();
    let configurationToCreate: CliConfiguration | undefined;
    if (selectedConfigurationExists) {
      const existingConfiguration = await configuration.read();
      if (
        normalizePathForComparison(existingConfiguration.linksFile) !==
        normalizePathForComparison(selected.linksFilePath)
      ) {
        throw new CliError(
          "CONFIGURATION_ERROR",
          `The existing configuration at ${selected.configFilePath} selects a different link store.`,
        );
      }
    } else {
      const current = await registry.read();
      const initialConfiguration = await configuration.read();
      configurationToCreate = {
        ...initialConfiguration,
        settings: {
          ...initialConfiguration.settings,
          ...current.settings,
        },
      };
    }

    if (
      normalizePathForComparison(selected.configFilePath) ===
      normalizePathForComparison(defaults.configFilePath)
    ) {
      await location.remove();
    } else {
      await location.write(selected.configFilePath);
    }
    if (configurationToCreate !== undefined) {
      await configuration.create(configurationToCreate);
    }
    await registry.initialize();
    options.output.write(`Configuration saved: ${selected.configFilePath}`);
    options.output.write(`Link store ready: ${selected.linksFilePath}`);
    return {
      configuration,
      configFilePath: selected.configFilePath,
      registry,
    };
  }

  const config = await configuration.read();
  const linksFilePath = linksOverride ?? config.linksFile;
  assertStoragePathsAreDistinct(
    configuration.filePath,
    linksFilePath,
    defaults.configLocationFilePath,
  );
  return {
    configuration,
    configFilePath: configuration.filePath,
    registry: createRegistry({
      configuration,
      linksFilePath,
      environment,
      persistConfigurationOnWrite:
        linksOverride === undefined || !configurationExists,
    }),
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw new CliError("CONFIGURATION_ERROR", `Could not access ${filePath}.`, {
      cause: error,
    });
  }
}

function createConfiguration(
  configFilePath: string,
  linksFilePath: string,
): JsonConfiguration {
  return new JsonConfiguration({
    filePath: configFilePath,
    defaults: createDefaultConfiguration(linksFilePath, {}),
  });
}

function createRegistry(options: {
  readonly configuration: JsonConfiguration;
  readonly environment: NodeJS.ProcessEnv;
  readonly linksFilePath: string;
  readonly persistConfigurationOnWrite: boolean;
}): JsonRegistry {
  return new JsonRegistry({
    configuration: options.configuration,
    fallbackSettings: () => resolveDefaultSettings(options.environment),
    filePath: options.linksFilePath,
    persistConfigurationOnWrite: options.persistConfigurationOnWrite,
  });
}

function assertStoragePathsAreDistinct(
  configFilePath: string,
  linksFilePath: string,
  locationFilePath: string,
): void {
  const paths = [configFilePath, linksFilePath, locationFilePath].map(
    normalizePathForComparison,
  );
  if (new Set(paths).size !== paths.length) {
    throw new CliError(
      "CONFIGURATION_ERROR",
      "config.json, links.json, and active-config.json must use different paths.",
    );
  }
}
