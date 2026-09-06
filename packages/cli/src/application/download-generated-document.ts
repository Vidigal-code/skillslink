import {
  decodeDocumentPayload,
  extractDocumentPayloadFromUrl,
} from "@skillslink/link-format";

import { CliError } from "../domain/cli-error";
import type { RegisteredLinkTarget } from "../domain/registry";
import type { DocumentDestinationWriter } from "./ports";

export interface DownloadGeneratedDocumentInput {
  readonly link: RegisteredLinkTarget;
  readonly directoryPath: string;
  readonly overwrite: boolean;
}

export async function downloadGeneratedDocument(
  input: DownloadGeneratedDocumentInput,
  writer: DocumentDestinationWriter,
): Promise<string> {
  try {
    const payload = extractDocumentPayloadFromUrl(input.link.url);
    if (payload === null) {
      throw new TypeError("The document payload is missing from the URL.");
    }

    const document = decodeDocumentPayload(payload);
    return await writer.write(document, input.directoryPath, {
      overwrite: input.overwrite,
    });
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError(
      "DOCUMENT_ERROR",
      `Could not recover ${input.link.name} from its registered URL.`,
      { cause: error },
    );
  }
}
