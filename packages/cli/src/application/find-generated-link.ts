import type { GeneratedLink, LinkRegistry } from "../domain/registry";

export function findGeneratedLink(
  identifier: string,
  registry: LinkRegistry,
): GeneratedLink | undefined {
  const normalizedIdentifier = identifier.trim();
  const exactMatch = registry.links.find(
    (link) =>
      link.id === normalizedIdentifier || link.url === normalizedIdentifier,
  );

  if (exactMatch !== undefined) {
    return exactMatch;
  }

  const normalizedName = normalizedIdentifier.toLocaleLowerCase("en-US");
  return registry.links.reduce<GeneratedLink | undefined>((newest, link) => {
    if (link.name.toLocaleLowerCase("en-US") !== normalizedName) {
      return newest;
    }

    return newest === undefined || link.createdAt > newest.createdAt
      ? link
      : newest;
  }, undefined);
}
