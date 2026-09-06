import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PORTABLE_LINK_DISPLAY_MODES } from "@skillslink/link-format";
import { z } from "zod";

import {
  LINKS_FILE_KIND,
  LINKS_FILE_SCHEMA_VERSION,
} from "../domain/configuration";
import { CliError } from "../domain/cli-error";
import {
  DEFAULT_LIST_DISPLAY_MODE,
  REGISTRY_SCHEMA_VERSION,
  type GeneratedLink,
  type LinkRegistry,
  type RegistrySettings,
} from "../domain/registry";
import { writeJsonAtomically } from "./atomic-json-file";
import type { JsonConfiguration } from "./json-configuration";

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

const legacySettingsSchema = z.object({
  siteUrl: z.url(),
  listDisplayMode: z
    .enum(PORTABLE_LINK_DISPLAY_MODES)
    .default(DEFAULT_LIST_DISPLAY_MODE),
});

const linksFileSchema = z.strictObject({
  kind: z.literal(LINKS_FILE_KIND),
  schemaVersion: z.literal(LINKS_FILE_SCHEMA_VERSION),
  links: z.array(generatedLinkSchema),
});

const combinedRegistrySchema = z.object({
  schemaVersion: z.literal(REGISTRY_SCHEMA_VERSION),
  settings: legacySettingsSchema,
  links: z.array(generatedLinkSchema),
});

const legacyRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  settings: legacySettingsSchema,
  links: z.array(legacyGeneratedLinkSchema),
});

interface StoredLinks {
  readonly exists: boolean;
  readonly format: "empty" | "links" | "combined";
  readonly legacySettings?: RegistrySettings;
  readonly links: readonly GeneratedLink[];
}

export interface JsonRegistryOptions {
  readonly filePath: string;
  readonly configuration: JsonConfiguration;
  readonly fallbackSettings?: () => RegistrySettings;
  readonly persistConfigurationOnWrite?: boolean;
}

export class JsonRegistry {
  readonly filePath: string;
  private readonly configuration: JsonConfiguration;
  private readonly fallbackSettings: (() => RegistrySettings) | undefined;
  private readonly persistConfigurationOnWrite: boolean;

  constructor(options: JsonRegistryOptions) {
    this.filePath = resolve(options.filePath);
    this.configuration = options.configuration;
    this.fallbackSettings = options.fallbackSettings;
    this.persistConfigurationOnWrite =
      options.persistConfigurationOnWrite ?? true;
  }

  async read(): Promise<LinkRegistry> {
    const [configurationExists, configuration, stored] = await Promise.all([
      this.configuration.exists(),
      this.configuration.read(),
      this.readStoredLinks(),
    ]);
    const settings = configurationExists
      ? selectRegistrySettings(configuration.settings)
      : (stored.legacySettings ??
        this.fallbackSettings?.() ??
        selectRegistrySettings(configuration.settings));
    assertIdentifiersAreUnique(stored.links);
    return {
      schemaVersion: REGISTRY_SCHEMA_VERSION,
      settings,
      links: stored.links,
    };
  }

  async initialize(): Promise<LinkRegistry> {
    const current = await this.read();
    const stored = await this.readStoredLinks();
    await this.configuration.ensureInitialized({
      linksFile: this.filePath,
      settings: current.settings,
    });
    if (!stored.exists || stored.format === "combined") {
      await this.writeLinks(stored.links);
    }
    return this.read();
  }

  async updateSettings(
    settings: Partial<RegistrySettings>,
  ): Promise<LinkRegistry> {
    const current = await this.read();
    const configuration = await this.configuration.updateSettings(
      settings,
      current.settings,
    );
    return {
      ...current,
      settings: selectRegistrySettings(configuration.settings),
    };
  }

  async upsertLink(link: GeneratedLink): Promise<LinkRegistry> {
    const current = await this.read();
    const validLink = generatedLinkSchema.parse(link);
    assertIdentifiersAreUnique([...current.links, validLink]);
    const links = [validLink, ...current.links].sort(compareGeneratedLinks);
    await this.ensureConfigurationForWrite(current.settings);
    await this.writeLinks(links);
    return { ...current, links };
  }

  async removeLink(documentId: string): Promise<GeneratedLink | undefined> {
    const current = await this.read();
    const link = current.links.find((item) => item.id === documentId);
    if (link === undefined) {
      return undefined;
    }

    await this.ensureConfigurationForWrite(current.settings);
    await this.writeLinks(
      current.links.filter((item) => item.id !== documentId),
    );
    return link;
  }

  private async ensureConfigurationForWrite(
    settings: RegistrySettings,
  ): Promise<void> {
    if (!this.persistConfigurationOnWrite) {
      return;
    }
    await this.configuration.ensureInitialized({
      linksFile: this.filePath,
      settings,
    });
  }

  private async readStoredLinks(): Promise<StoredLinks> {
    let serialized: string;
    try {
      serialized = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isFileSystemError(error, "ENOENT")) {
        return { exists: false, format: "empty", links: [] };
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
        `The link store at ${this.filePath} does not contain valid JSON.`,
        { cause: error },
      );
    }

    const linksResult = linksFileSchema.safeParse(value);
    if (linksResult.success) {
      return {
        exists: true,
        format: "links",
        links: linksResult.data.links,
      };
    }

    const combinedResult = combinedRegistrySchema.safeParse(value);
    if (combinedResult.success) {
      return {
        exists: true,
        format: "combined",
        legacySettings: combinedResult.data.settings,
        links: combinedResult.data.links,
      };
    }

    const legacyResult = legacyRegistrySchema.safeParse(value);
    if (legacyResult.success) {
      return {
        exists: true,
        format: "combined",
        legacySettings: legacyResult.data.settings,
        links: legacyResult.data.links.map((link) => ({
          ...link,
          parts: [],
        })),
      };
    }

    throw new CliError(
      "REGISTRY_ERROR",
      `The link store at ${this.filePath} has an invalid format: ${z.prettifyError(linksResult.error)}`,
    );
  }

  private async writeLinks(links: readonly GeneratedLink[]): Promise<void> {
    assertIdentifiersAreUnique(links);
    const value = linksFileSchema.parse({
      kind: LINKS_FILE_KIND,
      schemaVersion: LINKS_FILE_SCHEMA_VERSION,
      links,
    });
    try {
      await writeJsonAtomically({
        filePath: this.filePath,
        value,
        mode: 0o600,
      });
    } catch (error) {
      throw new CliError("REGISTRY_ERROR", `Could not save ${this.filePath}.`, {
        cause: error,
      });
    }
  }
}

function selectRegistrySettings(settings: {
  readonly listDisplayMode: RegistrySettings["listDisplayMode"];
  readonly siteUrl: string;
}): RegistrySettings {
  return {
    listDisplayMode: settings.listDisplayMode,
    siteUrl: settings.siteUrl,
  };
}

function assertIdentifiersAreUnique(links: readonly GeneratedLink[]): void {
  const identifiers = new Set<string>();
  for (const link of links) {
    for (const id of [link.id, ...link.parts.map((part) => part.id)]) {
      const normalizedId = id.toLocaleLowerCase("en-US");
      if (identifiers.has(normalizedId)) {
        throw new CliError(
          "REGISTRY_ERROR",
          `The link store contains the duplicate ID ${id}.`,
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
