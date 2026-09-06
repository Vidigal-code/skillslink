import { homedir } from "node:os";
import path, { resolve } from "node:path";

import { LinkFormatError, normalizeSiteUrl } from "@skillslink/link-format";
import envPaths from "env-paths";

import {
  CONFIGURATION_KIND,
  CONFIGURATION_SCHEMA_VERSION,
  PROMPT_LANGUAGE,
  type CliConfiguration,
  type CliConfigurationSettings,
} from "../domain/configuration";
import { CliError } from "../domain/cli-error";
import {
  DEFAULT_LIST_DISPLAY_MODE,
  DEFAULT_SITE_URL,
  type RegistrySettings,
} from "../domain/registry";

const APPLICATION_NAME = "skillslink";
export const APPLICATION_DIRECTORY_NAME = ".skillslink";
export const CONFIGURATION_FILE_NAME = "config.json";
export const CONFIGURATION_LOCATION_FILE_NAME = "active-config.json";
export const LINKS_FILE_NAME = "links.json";
const LEGACY_REGISTRY_FILE_NAME = "registry.json";

export const ENVIRONMENT_KEYS = {
  config: "SKILLSLINK_CONFIG",
  siteUrl: "SKILLSLINK_SITE_URL",
  store: "SKILLSLINK_STORE",
} as const;

interface PathResolver {
  resolve(...paths: string[]): string;
}

export interface DefaultStoragePaths {
  readonly configFilePath: string;
  readonly configLocationFilePath: string;
  readonly linksFilePath: string;
}

export function resolveDefaultStoragePaths(
  homeDirectory = homedir(),
  pathResolver: PathResolver = path,
): DefaultStoragePaths {
  const applicationDirectory = pathResolver.resolve(
    homeDirectory,
    APPLICATION_DIRECTORY_NAME,
  );
  return {
    configFilePath: pathResolver.resolve(
      applicationDirectory,
      CONFIGURATION_FILE_NAME,
    ),
    configLocationFilePath: pathResolver.resolve(
      applicationDirectory,
      CONFIGURATION_LOCATION_FILE_NAME,
    ),
    linksFilePath: pathResolver.resolve(applicationDirectory, LINKS_FILE_NAME),
  };
}

export function resolveConfigurationOverride(
  explicitPath: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return resolveOptionalPath(
    explicitPath ?? environment[ENVIRONMENT_KEYS.config],
  );
}

export function resolveRegistryOverride(
  explicitPath: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return resolveOptionalPath(
    explicitPath ?? environment[ENVIRONMENT_KEYS.store],
  );
}

export function resolveLegacyRegistryPath(): string {
  return resolve(
    envPaths(APPLICATION_NAME, { suffix: "" }).data,
    LEGACY_REGISTRY_FILE_NAME,
  );
}

export function resolveDefaultSettings(
  environment: NodeJS.ProcessEnv = process.env,
): RegistrySettings {
  try {
    return {
      listDisplayMode: DEFAULT_LIST_DISPLAY_MODE,
      siteUrl: normalizeSiteUrl(
        environment[ENVIRONMENT_KEYS.siteUrl] ?? DEFAULT_SITE_URL,
      ),
    };
  } catch (error) {
    if (error instanceof LinkFormatError) {
      throw new CliError("CONFIGURATION_ERROR", error.message, {
        cause: error,
      });
    }
    throw error;
  }
}

export function resolveDefaultConfigurationSettings(
  environment: NodeJS.ProcessEnv = process.env,
): CliConfigurationSettings {
  return {
    ...resolveDefaultSettings(environment),
    completeLinks: true,
    dividedLinks: true,
    promptLanguage: PROMPT_LANGUAGE,
  };
}

export function createDefaultConfiguration(
  linksFile: string,
  environment: NodeJS.ProcessEnv = process.env,
): CliConfiguration {
  return {
    kind: CONFIGURATION_KIND,
    schemaVersion: CONFIGURATION_SCHEMA_VERSION,
    linksFile: resolve(linksFile),
    settings: resolveDefaultConfigurationSettings(environment),
  };
}

export function normalizePathForComparison(filePath: string): string {
  const absolutePath = resolve(filePath);
  return process.platform === "win32"
    ? absolutePath.toLocaleLowerCase("en-US")
    : absolutePath;
}

function resolveOptionalPath(value: string | undefined): string | undefined {
  return value === undefined || value.trim().length === 0
    ? undefined
    : resolve(value);
}
