import { CliError } from "../domain/cli-error";
import type { LinkRegistry, RegisteredLinkTarget } from "../domain/registry";

export function createRegisteredLinkTargets(
  registry: LinkRegistry,
): readonly RegisteredLinkTarget[] {
  return registry.links.flatMap((link) => [
    {
      kind: "document" as const,
      id: link.id,
      parentId: link.id,
      name: link.name,
      title: link.name,
      url: link.url,
      createdAt: link.createdAt,
    },
    ...link.parts.map((part) => ({
      kind: "part" as const,
      id: part.id,
      parentId: link.id,
      name: part.name,
      title: part.title,
      url: part.url,
      createdAt: link.createdAt,
    })),
  ]);
}

export function findRegisteredLinkTarget(
  identifier: string,
  registry: LinkRegistry,
): RegisteredLinkTarget | undefined {
  const targets = createRegisteredLinkTargets(registry);
  const normalizedIdentifier = identifier.trim();
  const exactMatch = targets.find(
    (target) =>
      target.id === normalizedIdentifier || target.url === normalizedIdentifier,
  );

  if (exactMatch !== undefined) {
    return exactMatch;
  }

  const normalizedName = normalizedIdentifier.toLocaleLowerCase("en-US");
  return targets.reduce<RegisteredLinkTarget | undefined>((newest, target) => {
    const matches = [target.name, target.title].some(
      (value) => value.toLocaleLowerCase("en-US") === normalizedName,
    );
    if (!matches) {
      return newest;
    }

    return newest === undefined || target.createdAt > newest.createdAt
      ? target
      : newest;
  }, undefined);
}

export function getRegisteredLinkTarget(
  identifier: string,
  registry: LinkRegistry,
): RegisteredLinkTarget {
  const target = findRegisteredLinkTarget(identifier, registry);
  if (target === undefined) {
    throw new CliError(
      "REGISTRY_ERROR",
      `No registered link was found for ${identifier}.`,
    );
  }

  return target;
}
