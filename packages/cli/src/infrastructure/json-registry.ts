import { readFile } from "node:fs/promises";

import { z } from "zod";
import { PORTABLE_LINK_DISPLAY_MODES } from "@skillslink/link-format";

import { CliError } from "../domain/cli-error";
import {
  DEFAULT_LIST_DISPLAY_MODE,
  REGISTRY_SCHEMA_VERSION,
  type GeneratedLink,
  type LinkRegistry,
  type RegistrySettings,
} from "../domain/registry";
import { writeJsonAtomically } from "./atomic-json-file";

const legacyIdentifierSchema = z.string().regex(/^[a-f0-9]{16}$/u);
const storedIdentifierSchema = z.union([z.uuid(), legacyIdentifierSchema]);

const generatedLinkSchema = z.object({
  id: storedIdentifierSchema,
  name: z.string().min(1),
  mediaType: z.literal("text/markdown"),
  url: z.url(),
  createdAt: z.iso.datetime({ offset: true }),
  parts: z.array(
    z.object({
      id: z.uuid(),
      title: z.string().min(1),
      headingLevel: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.null(),
      ]),
      name: z.string().min(1),
      byteLength: z.number().int().nonnegative(),
      url: z.url(),
    }),
  ),
});

const legacyGeneratedLinkSchema = generatedLinkSchema
  .omit({ parts: true, id: true })
  .extend({ id: legacyIdentifierSchema });

const settingsSchema = z.object({
  siteUrl: z.url(),
  listDisplayMode: z
    .enum(PORTABLE_LINK_DISPLAY_MODES)
    .default(DEFAULT_LIST_DISPLAY_MODE),
});

const registrySchema = z.object({
  schemaVersion: z.literal(REGISTRY_SCHEMA_VERSION),
  settings: settingsSchema,
  links: z.array(generatedLinkSchema),
});

const legacyRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  settings: settingsSchema,
  links: z.array(legacyGeneratedLinkSchema),
});

export interface JsonRegistryOptions {
  readonly filePath: string;
  readonly defaults: RegistrySettings;
}

export class JsonRegistry {
  readonly filePath: string;
  readonly defaults: RegistrySettings;

  constructor(options: JsonRegistryOptions) {
    this.filePath = options.filePath;
    this.defaults = settingsSchema.parse(options.defaults);
  }

  async read(): Promise<LinkRegistry> {
    let serialized: string;

    try {
      serialized = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isFileSystemError(error, "ENOENT")) {
        return this.createEmptyRegistry();
      }

      throw new CliError("REGISTRY_ERROR", `Could not read ${this.filePath}.`, {
        cause: error,
      });
    }

    let value: unknown;
    try {
      value = JSON.parse(serialized) as unknown;
    } catch (error) {
      throw new CliError(
        "REGISTRY_ERROR",
        `The registry at ${this.filePath} does not contain valid JSON.`,
        { cause: error },
      );
    }

    return this.parseRegistry(value);
  }

  async updateSettings(
    settings: Partial<RegistrySettings>,
  ): Promise<LinkRegistry> {
    const current = await this.read();
    const next = registrySchema.parse({
      ...current,
      settings: { ...current.settings, ...settings },
    });
    await this.write(next);
    return next;
  }

  async upsertLink(link: GeneratedLink): Promise<LinkRegistry> {
    const current = await this.read();
    const validLink = generatedLinkSchema.parse(link);
    assertIdentifiersAreUnique([...current.links, validLink]);
    const links = [validLink, ...current.links].sort(compareGeneratedLinks);
    const next = registrySchema.parse({ ...current, links });
    await this.write(next);
    return next;
  }

  async removeLink(documentId: string): Promise<GeneratedLink | undefined> {
    const current = await this.read();
    const link = current.links.find((item) => item.id === documentId);

    if (link === undefined) {
      return undefined;
    }

    await this.write({
      ...current,
      links: current.links.filter((item) => item.id !== documentId),
    });
    return link;
  }

  private createEmptyRegistry(): LinkRegistry {
    return {
      schemaVersion: REGISTRY_SCHEMA_VERSION,
      settings: this.defaults,
      links: [],
    };
  }

  private parseRegistry(value: unknown): LinkRegistry {
    const currentResult = registrySchema.safeParse(value);
    if (currentResult.success) {
      assertIdentifiersAreUnique(currentResult.data.links);
      return currentResult.data;
    }

    const legacyResult = legacyRegistrySchema.safeParse(value);
    if (legacyResult.success) {
      const migrated: LinkRegistry = {
        schemaVersion: REGISTRY_SCHEMA_VERSION,
        settings: legacyResult.data.settings,
        links: legacyResult.data.links.map((link) => ({
          ...link,
          parts: [],
        })),
      };
      assertIdentifiersAreUnique(migrated.links);
      return migrated;
    }

    throw new CliError(
      "REGISTRY_ERROR",
      `The registry at ${this.filePath} has an invalid format: ${z.prettifyError(currentResult.error)}`,
    );
  }

  private async write(registry: LinkRegistry): Promise<void> {
    try {
      await writeJsonAtomically({
        filePath: this.filePath,
        value: registry,
        mode: 0o600,
      });
    } catch (error) {
      throw new CliError("REGISTRY_ERROR", `Could not save ${this.filePath}.`, {
        cause: error,
      });
    }
  }
}

function assertIdentifiersAreUnique(links: readonly GeneratedLink[]): void {
  const identifiers = new Set<string>();

  for (const link of links) {
    for (const id of [link.id, ...link.parts.map((part) => part.id)]) {
      const normalizedId = id.toLocaleLowerCase("en-US");
      if (identifiers.has(normalizedId)) {
        throw new CliError(
          "REGISTRY_ERROR",
          `The registry contains the duplicate ID ${id}.`,
        );
      }
      identifiers.add(normalizedId);
    }
  }
}

function compareGeneratedLinks(
  left: GeneratedLink,
  right: GeneratedLink,
): number {
  return right.createdAt.localeCompare(left.createdAt);
}

function isFileSystemError(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
