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
  type DefaultStoragePaths,
} from "../config/runtime-config";
import { CliError } from "../domain/cli-error";
import type { CliConfiguration } from "../domain/configuration";
import { JsonConfigurationLocation } from "../infrastructure/json-configuration-location";
import { JsonConfiguration } from "../infrastructure/json-configuration";
import { JsonRegistry } from "../infrastructure/json-registry";
import {
  resolveInitialStoragePaths,
  type InitialStoragePaths,
} from "./interactive";
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

export interface StorageSessionOptions {
  readonly interactive: boolean;
  readonly output: CliOutput;
  readonly runtime?: StorageRuntime;
}

export interface StorageSession {
  readonly configuration: JsonConfiguration;
  readonly configFilePath: string;
  readonly registry: JsonRegistry;
}

interface StorageTarget {
  readonly configFilePath: string;
  readonly implicitLinksFilePath: string;
  readonly configuration: JsonConfiguration;
  readonly configurationExists: boolean;
}

interface StoragePlan {
  readonly environment: NodeJS.ProcessEnv;
  readonly defaults: DefaultStoragePaths;
  readonly location: JsonConfigurationLocation;
  readonly configOverride: string | undefined;
  readonly linksOverride: string | undefined;
  readonly target: StorageTarget;
}

interface StorageTargetInput extends Pick<
  StoragePlan,
  "defaults" | "configOverride" | "linksOverride"
> {
  readonly locatedConfigFile: string | undefined;
  readonly runtime: StorageRuntime | undefined;
}

interface StorageTargetPaths
  extends
    Pick<StorageTarget, "configFilePath" | "implicitLinksFilePath">,
    Pick<StoragePlan, "linksOverride"> {}

export async function createStorageSession(
  selectors: StorageSelectors,
  options: StorageSessionOptions,
): Promise<StorageSession | undefined> {
  const plan = await planStorage(selectors, options.runtime);
  return options.interactive && requiresInitialSetup(plan)
    ? setUpInitialStorage(plan, options.output)
    : openStorage(plan);
}

async function planStorage(
  selectors: StorageSelectors,
  runtime: StorageRuntime | undefined,
): Promise<StoragePlan> {
  const environment = runtime?.environment ?? process.env;
  const defaults = resolveDefaultStoragePaths(
    runtime?.homeDirectory ?? homedir(),
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
  const target = await resolveStorageTarget({
    defaults,
    configOverride,
    linksOverride,
    locatedConfigFile,
    runtime,
  });

  return {
    environment,
    defaults,
    location,
    configOverride,
    linksOverride,
    target,
  };
}

async function resolveStorageTarget(
  input: StorageTargetInput,
): Promise<StorageTarget> {
  const { defaults, configOverride, linksOverride, locatedConfigFile } = input;
  const target = await inspectStorageTarget({
    configFilePath:
      configOverride ?? locatedConfigFile ?? defaults.configFilePath,
    implicitLinksFilePath:
      locatedConfigFile === undefined
        ? defaults.linksFilePath
        : join(dirname(locatedConfigFile), LINKS_FILE_NAME),
    linksOverride,
  });
  const usesDefaultLocation =
    configOverride === undefined && locatedConfigFile === undefined;
  if (target.configurationExists || !usesDefaultLocation) {
    return target;
  }

  if (linksOverride !== undefined) {
    return inspectStorageTarget({
      configFilePath: join(dirname(linksOverride), CONFIGURATION_FILE_NAME),
      implicitLinksFilePath: target.implicitLinksFilePath,
      linksOverride,
    });
  }

  const implicitLinksFilePath = await resolveFirstRunLinksFile(
    defaults.linksFilePath,
    input.runtime,
  );
  return {
    ...target,
    implicitLinksFilePath,
    configuration: createConfiguration(
      target.configFilePath,
      implicitLinksFilePath,
    ),
  };
}

async function inspectStorageTarget({
  configFilePath,
  implicitLinksFilePath,
  linksOverride,
}: StorageTargetPaths): Promise<StorageTarget> {
  const configuration = createConfiguration(
    configFilePath,
    linksOverride ?? implicitLinksFilePath,
  );
  return {
    configFilePath,
    implicitLinksFilePath,
    configuration,
    configurationExists: await configuration.exists(),
  };
}

async function resolveFirstRunLinksFile(
  defaultLinksFilePath: string,
  runtime: StorageRuntime | undefined,
): Promise<string> {
  if (await fileExists(defaultLinksFilePath)) {
    return defaultLinksFilePath;
  }

  const legacyRegistryFilePath =
    runtime?.legacyRegistryFilePath ?? resolveLegacyRegistryPath();
  return (await fileExists(legacyRegistryFilePath))
    ? legacyRegistryFilePath
    : defaultLinksFilePath;
}

function requiresInitialSetup(plan: StoragePlan): boolean {
  return (
    !plan.target.configurationExists &&
    plan.configOverride === undefined &&
    plan.linksOverride === undefined
  );
}

async function setUpInitialStorage(
  plan: StoragePlan,
  output: CliOutput,
): Promise<StorageSession | undefined> {
  const selected = await resolveInitialStoragePaths({
    configFilePath: plan.target.configFilePath,
    linksFilePath: plan.target.implicitLinksFilePath,
  });
  if (selected === undefined) {
    return undefined;
  }
  assertStoragePathsAreDistinct(
    selected.configFilePath,
    selected.linksFilePath,
    plan.defaults.configLocationFilePath,
  );

  const configuration = createConfiguration(
    selected.configFilePath,
    selected.linksFilePath,
  );
  const registry = createRegistry({
    configuration,
    linksFilePath: selected.linksFilePath,
    environment: plan.environment,
    persistConfigurationOnWrite: true,
  });
  const configurationToCreate = await prepareInitialConfiguration(
    configuration,
    registry,
    selected,
  );
  await rememberConfigurationLocation(plan, selected.configFilePath);
  if (configurationToCreate !== undefined) {
    await configuration.create(configurationToCreate);
  }
  await registry.initialize();
  output.write(`Configuration saved: ${selected.configFilePath}`);
  output.write(`Link store ready: ${selected.linksFilePath}`);

  return {
    configuration,
    configFilePath: selected.configFilePath,
    registry,
  };
}

async function prepareInitialConfiguration(
  configuration: JsonConfiguration,
  registry: JsonRegistry,
  selected: InitialStoragePaths,
): Promise<CliConfiguration | undefined> {
  if (await configuration.exists()) {
    const existingConfiguration = await configuration.read();
    if (!isSamePath(existingConfiguration.linksFile, selected.linksFilePath)) {
      throw new CliError(
        "CONFIGURATION_ERROR",
        `The existing configuration at ${selected.configFilePath} selects a different link store.`,
      );
    }
    return undefined;
  }

  const current = await registry.read();
  const initialConfiguration = await configuration.read();
  return {
    ...initialConfiguration,
    settings: {
      ...initialConfiguration.settings,
      ...current.settings,
    },
  };
}

async function rememberConfigurationLocation(
  plan: StoragePlan,
  configFilePath: string,
): Promise<void> {
  if (isSamePath(configFilePath, plan.defaults.configFilePath)) {
    await plan.location.remove();
    return;
  }

  await plan.location.write(configFilePath);
}

async function openStorage(plan: StoragePlan): Promise<StorageSession> {
  const { configuration, configurationExists } = plan.target;
  const config = await configuration.read();
  const linksFilePath = plan.linksOverride ?? config.linksFile;
  assertStoragePathsAreDistinct(
    configuration.filePath,
    linksFilePath,
    plan.defaults.configLocationFilePath,
  );

  return {
    configuration,
    configFilePath: configuration.filePath,
    registry: createRegistry({
      configuration,
      linksFilePath,
      environment: plan.environment,
      persistConfigurationOnWrite:
        plan.linksOverride === undefined || !configurationExists,
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

function isSamePath(left: string, right: string): boolean {
  return normalizePathForComparison(left) === normalizePathForComparison(right);
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
    (filePath) => normalizePathForComparison(filePath),
  );
  if (new Set(paths).size !== paths.length) {
    throw new CliError(
      "CONFIGURATION_ERROR",
      "config.json, links.json, and active-config.json must use different paths.",
    );
  }
}
