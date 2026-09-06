import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

import {
  getDocumentMediaTypeFromFileName,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_KIBIBYTES,
  parseSharedDocument,
  type SharedDocument,
} from "@skillslink/link-format";

import type { DocumentSourceReader } from "../application/ports";
import { CliError } from "../domain/cli-error";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const DOCUMENT_SIZE_LIMIT_LABEL = `${MAX_DOCUMENT_KIBIBYTES} KiB`;

export class NodeDocumentSourceReader implements DocumentSourceReader {
  async read(filePath: string): Promise<SharedDocument> {
    const fileName = basename(filePath);
    const mediaType = getDocumentMediaTypeFromFileName(fileName);

    if (mediaType === undefined) {
      throw new CliError("DOCUMENT_ERROR", "Only .md files are accepted.");
    }

    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        throw new CliError(
          "DOCUMENT_ERROR",
          "The provided path is not a file.",
        );
      }

      if (fileStats.size > MAX_DOCUMENT_BYTES) {
        throw new CliError(
          "DOCUMENT_ERROR",
          `The file exceeds the ${DOCUMENT_SIZE_LIMIT_LABEL} limit.`,
        );
      }

      const bytes = await readFile(filePath);
      return parseSharedDocument({
        name: fileName,
        mediaType,
        content: utf8Decoder.decode(bytes),
      });
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }

      if (error instanceof TypeError) {
        throw new CliError(
          "DOCUMENT_ERROR",
          "The file does not contain valid UTF-8 text.",
          {
            cause: error,
          },
        );
      }

      throw new CliError("DOCUMENT_ERROR", `Could not read ${filePath}.`, {
        cause: error,
      });
    }
  }
}
