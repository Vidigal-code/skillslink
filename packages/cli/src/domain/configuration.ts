import type { RegistrySettings } from "./registry";

export const CONFIGURATION_KIND = "skillslink-config" as const;
export const CONFIGURATION_SCHEMA_VERSION = 1 as const;
export const CONFIGURATION_LOCATION_KIND =
  "skillslink-config-location" as const;
export const CONFIGURATION_LOCATION_SCHEMA_VERSION = 1 as const;
export const LINKS_FILE_KIND = "skillslink-links" as const;
export const LINKS_FILE_SCHEMA_VERSION = 1 as const;
export const PROMPT_LANGUAGE = "en" as const;

export interface CliConfigurationSettings extends RegistrySettings {
  readonly completeLinks: true;
  readonly dividedLinks: true;
  readonly promptLanguage: typeof PROMPT_LANGUAGE;
}

export interface CliConfiguration {
  readonly kind: typeof CONFIGURATION_KIND;
  readonly schemaVersion: typeof CONFIGURATION_SCHEMA_VERSION;
  readonly linksFile: string;
  readonly settings: CliConfigurationSettings;
}

export interface ConfigurationLocation {
  readonly kind: typeof CONFIGURATION_LOCATION_KIND;
  readonly schemaVersion: typeof CONFIGURATION_LOCATION_SCHEMA_VERSION;
  readonly configFile: string;
}
