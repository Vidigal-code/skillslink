import {
  createDocumentParts,
  createViewerUrl,
  encodeDocumentPayload,
} from "@skillslink/link-format";

import { CliError } from "../domain/cli-error";
import type { GeneratedLink, LinkRegistry } from "../domain/registry";
import type { Clock, DocumentSourceReader, IdentifierGenerator } from "./ports";

const MAXIMUM_IDENTIFIER_ATTEMPTS = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export interface GenerateDocumentLinkInput {
  readonly filePath: string;
  readonly siteUrl: string;
  readonly reservedIds?: readonly string[];
}

export interface GenerateDocumentLinkDependencies {
  readonly clock: Clock;
  readonly identifierGenerator: IdentifierGenerator;
  readonly sourceReader: DocumentSourceReader;
}

export async function generateDocumentLink(
  input: GenerateDocumentLinkInput,
  dependencies: GenerateDocumentLinkDependencies,
): Promise<GeneratedLink> {
  const document = await dependencies.sourceReader.read(input.filePath);
  const usedIds = new Set(
    (input.reservedIds ?? []).map((id) => id.toLocaleLowerCase("en-US")),
  );
  const id = createUniqueIdentifier(dependencies.identifierGenerator, usedIds);
  const createUrl = (value: typeof document) =>
    createViewerUrl({
      siteUrl: input.siteUrl,
      payload: encodeDocumentPayload(value),
    });

  return {
    id,
    name: document.name,
    mediaType: document.mediaType,
    url: createUrl(document),
    createdAt: dependencies.clock().toISOString(),
    parts: createDocumentParts(document).map((part) => ({
      id: createUniqueIdentifier(dependencies.identifierGenerator, usedIds),
      title: part.title,
      headingLevel: part.headingLevel,
      name: part.document.name,
      byteLength: part.byteLength,
      url: createUrl(part.document),
    })),
  };
}

export function collectRegisteredIdentifiers(
  registry: LinkRegistry,
): readonly string[] {
  return registry.links.flatMap((link) => [
    link.id,
    ...link.parts.map((part) => part.id),
  ]);
}

function createUniqueIdentifier(
  generateIdentifier: IdentifierGenerator,
  usedIds: Set<string>,
): string {
  for (let attempt = 0; attempt < MAXIMUM_IDENTIFIER_ATTEMPTS; attempt += 1) {
    const candidate = generateIdentifier();
    if (!UUID_PATTERN.test(candidate)) {
      throw new CliError(
        "CONFIGURATION_ERROR",
        "The identifier generator returned an invalid UUID.",
      );
    }

    const normalizedCandidate = candidate.toLocaleLowerCase("en-US");
    if (!usedIds.has(normalizedCandidate)) {
      usedIds.add(normalizedCandidate);
      return normalizedCandidate;
    }
  }

  throw new CliError(
    "REGISTRY_ERROR",
    "Could not create a unique UUID for the generated link.",
  );
}
