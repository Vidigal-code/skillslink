import { resolve } from "node:path";

import envPaths from "env-paths";
import { normalizeSiteUrl } from "@skillslink/link-format";

import {
  DEFAULT_LIST_DISPLAY_MODE,
  DEFAULT_SITE_URL,
  type RegistrySettings,
} from "../domain/registry";

const APPLICATION_NAME = "skillslink";
const REGISTRY_FILE_NAME = "registry.json";

export const ENVIRONMENT_KEYS = {
  siteUrl: "SKILLSLINK_SITE_URL",
  store: "SKILLSLINK_STORE",
} as const;

export function resolveRegistryPath(
  explicitPath: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const selectedPath = explicitPath ?? environment[ENVIRONMENT_KEYS.store];
  if (selectedPath !== undefined && selectedPath.trim().length > 0) {
    return resolve(selectedPath);
  }

  return resolve(
    envPaths(APPLICATION_NAME, { suffix: "" }).data,
    REGISTRY_FILE_NAME,
  );
}

export function resolveDefaultSettings(
  environment: NodeJS.ProcessEnv = process.env,
): RegistrySettings {
  return {
    listDisplayMode: DEFAULT_LIST_DISPLAY_MODE,
    siteUrl: normalizeSiteUrl(
      environment[ENVIRONMENT_KEYS.siteUrl] ?? DEFAULT_SITE_URL,
    ),
  };
}
