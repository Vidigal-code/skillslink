import type { GeneratedLink } from "../domain/registry";
import { getGeneratedLink } from "./get-generated-link";
import type { RegistryRepository } from "./ports";

export async function removeGeneratedLink(
  identifier: string,
  registry: RegistryRepository,
): Promise<GeneratedLink> {
  const current = await registry.read();
  const link = getGeneratedLink(identifier, current);

  await registry.removeLink(link.id);
  return link;
}
