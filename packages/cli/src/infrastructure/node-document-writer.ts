import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { SharedDocument } from "@skillslink/link-format";

import type { DocumentDestinationWriter } from "../application/ports";
import { CliError } from "../domain/cli-error";

const PRIVATE_FILE_MODE = 0o600;

export class DestinationExistsError extends CliError {
  readonly destinationPath: string;

  constructor(destinationPath: string, options?: ErrorOptions) {
    super(
      "DOCUMENT_ERROR",
      `The destination already exists: ${destinationPath}`,
      options,
    );
    this.name = "DestinationExistsError";
    this.destinationPath = destinationPath;
  }
}

export class NodeDocumentWriter implements DocumentDestinationWriter {
  async write(
    document: SharedDocument,
    directoryPath: string,
    options: { readonly overwrite: boolean },
  ): Promise<string> {
    const directory = resolve(directoryPath);
    const destination = resolve(directory, document.name);
    if (dirname(destination) !== directory) {
      throw new CliError(
        "DOCUMENT_ERROR",
        "The document name cannot escape the selected directory.",
      );
    }

    try {
      await mkdir(directory, { recursive: true });
      await writeFile(destination, document.content, {
        encoding: "utf8",
        flag: options.overwrite ? "w" : "wx",
        mode: PRIVATE_FILE_MODE,
      });
      return destination;
    } catch (error) {
      if (isFileSystemError(error, "EEXIST")) {
        throw new DestinationExistsError(destination, { cause: error });
      }

      throw new CliError(
        "DOCUMENT_ERROR",
        `Could not save the document to ${destination}.`,
        { cause: error },
      );
    }
  }
}

function isFileSystemError(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
