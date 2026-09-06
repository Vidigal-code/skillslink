import { access, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import {
  LinkFormatError,
  normalizeSiteUrl,
  PORTABLE_LINK_DISPLAY_MODES,
} from "@skillslink/link-format";
import { z } from "zod";

import {
  CONFIGURATION_KIND,
  CONFIGURATION_SCHEMA_VERSION,
  PROMPT_LANGUAGE,
  type CliConfiguration,
} from "../domain/configuration";
import { CliError } from "../domain/cli-error";
import type { RegistrySettings } from "../domain/registry";
import { writeJsonAtomically } from "./atomic-json-file";

const configurationSchema = z.strictObject({
  kind: z.literal(CONFIGURATION_KIND),
  schemaVersion: z.literal(CONFIGURATION_SCHEMA_VERSION),
  linksFile: z.string().min(1),
  settings: z.strictObject({
    siteUrl: z.string().min(1),
    listDisplayMode: z.enum(PORTABLE_LINK_DISPLAY_MODES),
    completeLinks: z.literal(true).default(true),
    dividedLinks: z.literal(true).default(true),
    promptLanguage: z.literal(PROMPT_LANGUAGE).default(PROMPT_LANGUAGE),
  }),
});

export class JsonConfiguration {
  readonly filePath: string;
  private readonly defaults: CliConfiguration;

  constructor(options: {
    readonly filePath: string;
    readonly defaults: CliConfiguration;
  }) {
    this.filePath = resolve(options.filePath);
    this.defaults = parseConfiguration(options.defaults, this.filePath);
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.filePath);
      return true;
    } catch (error) {
      if (isFileSystemError(error, "ENOENT")) {
        return false;
      }
      throw new CliError(
        "CONFIGURATION_ERROR",
        `Could not access ${this.filePath}.`,
        { cause: error },
      );
    }
  }

  async read(): Promise<CliConfiguration> {
    let serialized: string;
    try {
      serialized = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isFileSystemError(error, "ENOENT")) {
        return this.defaults;
      }
      throw new CliError(
        "CONFIGURATION_ERROR",
        `Could not read ${this.filePath}.`,
        { cause: error },
      );
    }

    return parseSerializedConfiguration(serialized, this.filePath);
  }

  async create(configuration: CliConfiguration): Promise<CliConfiguration> {
    if (await this.exists()) {
      throw new CliError(
        "CONFIGURATION_ERROR",
        `The configuration file already exists at ${this.filePath}.`,
      );
    }

    return this.write(configuration);
  }

  async ensureInitialized(
    overrides: {
      readonly linksFile?: string;
      readonly settings?: RegistrySettings;
    } = {},
  ): Promise<CliConfiguration> {
    if (await this.exists()) {
      return this.read();
    }

    return this.write({
      ...this.defaults,
      linksFile: overrides.linksFile ?? this.defaults.linksFile,
      settings: {
        ...this.defaults.settings,
        ...overrides.settings,
      },
    });
  }

  async updateSettings(
    settings: Partial<RegistrySettings>,
    initialSettings?: RegistrySettings,
  ): Promise<CliConfiguration> {
    const current = await this.ensureInitialized(
      initialSettings === undefined ? {} : { settings: initialSettings },
    );
    return this.write({
      ...current,
      settings: { ...current.settings, ...settings },
    });
  }

  private async write(
    configuration: CliConfiguration,
  ): Promise<CliConfiguration> {
    const validConfiguration = parseConfiguration(configuration, this.filePath);
    try {
      await writeJsonAtomically({
        filePath: this.filePath,
        value: validConfiguration,
        mode: 0o600,
      });
    } catch (error) {
      throw new CliError(
        "CONFIGURATION_ERROR",
        `Could not save ${this.filePath}.`,
        { cause: error },
      );
    }
    return validConfiguration;
  }
}

function parseSerializedConfiguration(
  serialized: string,
  filePath: string,
): CliConfiguration {
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new CliError(
      "CONFIGURATION_ERROR",
      `The configuration at ${filePath} does not contain valid JSON.`,
      { cause: error },
    );
  }
  return parseConfiguration(value, filePath);
}

function parseConfiguration(
  value: unknown,
  filePath: string,
): CliConfiguration {
  const result = configurationSchema.safeParse(value);
  if (!result.success) {
    throw new CliError(
      "CONFIGURATION_ERROR",
      `The configuration at ${filePath} has an invalid format: ${z.prettifyError(result.error)}`,
    );
  }
  if (!isAbsolute(result.data.linksFile)) {
    throw new CliError(
      "CONFIGURATION_ERROR",
      `The linksFile value in ${filePath} must be an absolute path.`,
    );
  }

  try {
    return {
      ...result.data,
      linksFile: resolve(result.data.linksFile),
      settings: {
        ...result.data.settings,
        siteUrl: normalizeSiteUrl(result.data.settings.siteUrl),
      },
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

function isFileSystemError(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
