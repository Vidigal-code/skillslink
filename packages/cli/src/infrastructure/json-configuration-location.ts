import { readFile, unlink } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import { z } from "zod";

import {
  CONFIGURATION_LOCATION_KIND,
  CONFIGURATION_LOCATION_SCHEMA_VERSION,
  type ConfigurationLocation,
} from "../domain/configuration";
import { CliError } from "../domain/cli-error";
import { writeJsonAtomically } from "./atomic-json-file";

const configurationLocationSchema = z.strictObject({
  kind: z.literal(CONFIGURATION_LOCATION_KIND),
  schemaVersion: z.literal(CONFIGURATION_LOCATION_SCHEMA_VERSION),
  configFile: z.string().min(1),
});

export class JsonConfigurationLocation {
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  async read(): Promise<string | undefined> {
    let serialized: string;
    try {
      serialized = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isFileSystemError(error, "ENOENT")) {
        return undefined;
      }
      throw createAccessError("read", this.filePath, error);
    }

    let value: unknown;
    try {
      value = JSON.parse(serialized) as unknown;
    } catch (error) {
      throw new CliError(
        "CONFIGURATION_ERROR",
        `The configuration location at ${this.filePath} does not contain valid JSON.`,
        { cause: error },
      );
    }

    const result = configurationLocationSchema.safeParse(value);
    if (!result.success || !isAbsolute(result.data.configFile)) {
      throw new CliError(
        "CONFIGURATION_ERROR",
        `The configuration location at ${this.filePath} has an invalid format.`,
      );
    }
    return resolve(result.data.configFile);
  }

  async write(configFile: string): Promise<void> {
    const location: ConfigurationLocation = {
      kind: CONFIGURATION_LOCATION_KIND,
      schemaVersion: CONFIGURATION_LOCATION_SCHEMA_VERSION,
      configFile: resolve(configFile),
    };
    try {
      await writeJsonAtomically({
        filePath: this.filePath,
        value: location,
        mode: 0o600,
      });
    } catch (error) {
      throw createAccessError("save", this.filePath, error);
    }
  }

  async remove(): Promise<void> {
    try {
      await unlink(this.filePath);
    } catch (error) {
      if (!isFileSystemError(error, "ENOENT")) {
        throw createAccessError("remove", this.filePath, error);
      }
    }
  }
}

function createAccessError(
  action: string,
  filePath: string,
  cause: unknown,
): CliError {
  return new CliError(
    "CONFIGURATION_ERROR",
    `Could not ${action} ${filePath}.`,
    { cause },
  );
}

function isFileSystemError(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
