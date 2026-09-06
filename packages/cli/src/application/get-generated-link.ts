import { CliError } from "../domain/cli-error";
import type { GeneratedLink, LinkRegistry } from "../domain/registry";
import { findGeneratedLink } from "./find-generated-link";

export function getGeneratedLink(
  identifier: string,
  registry: LinkRegistry,
): GeneratedLink {
  const link = findGeneratedLink(identifier, registry);

  if (link === undefined) {
    throw new CliError(
      "REGISTRY_ERROR",
      `No registered link was found for ${identifier}.`,
    );
  }

  return link;
}
