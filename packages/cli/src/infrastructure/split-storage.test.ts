import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveDefaultStoragePaths } from "../config/runtime-config";
import {
  CONFIGURATION_KIND,
  CONFIGURATION_SCHEMA_VERSION,
  LINKS_FILE_KIND,
  LINKS_FILE_SCHEMA_VERSION,
  PROMPT_LANGUAGE,
  type CliConfiguration,
} from "../domain/configuration";
import type { GeneratedLink, RegistrySettings } from "../domain/registry";
import { createStorageSession } from "../presentation/create-storage-session";
import type { CliOutput } from "../presentation/output";
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "../test/temporary-directory";
import { JsonConfiguration } from "./json-configuration";
import { JsonRegistry } from "./json-registry";

const DEFAULT_SETTINGS: RegistrySettings = {
  siteUrl: "https://default.example.com/",
  listDisplayMode: "divided",
};

const FIRST_LINK: GeneratedLink = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "first.md",
  mediaType: "text/markdown",
  url: "https://example.com/view/#document=v1.first",
  createdAt: "2026-09-06T12:00:00.000Z",
  parts: [],
};

const SECOND_LINK: GeneratedLink = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "second.md",
  mediaType: "text/markdown",
  url: "https://example.com/view/#document=v1.second",
  createdAt: "2026-09-06T13:00:00.000Z",
  parts: [],
};

describe("split JSON storage", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(removeTemporaryDirectory));
  });

  it("persists configuration and links as separate documents", async () => {
    const { configuration, configPath, linksPath, registry } =
      await createFixture(directories);

    await configuration.ensureInitialized();
    await registry.upsertLink(FIRST_LINK);

    const storedConfiguration = await readJson(configPath);
    const storedLinks = await readJson(linksPath);
    expect(storedConfiguration).toMatchObject({
      kind: CONFIGURATION_KIND,
      schemaVersion: CONFIGURATION_SCHEMA_VERSION,
      linksFile: linksPath,
      settings: DEFAULT_SETTINGS,
    });
    expect(storedConfiguration).not.toHaveProperty("links");
    expect(storedLinks).toEqual({
      kind: LINKS_FILE_KIND,
      schemaVersion: LINKS_FILE_SCHEMA_VERSION,
      links: [FIRST_LINK],
    });
    expect(storedLinks).not.toHaveProperty("settings");
  });

  it.each([
    {
      label: "version 1",
      registry: {
        schemaVersion: 1,
        settings: { siteUrl: "https://legacy-v1.example.com/" },
        links: [
          {
            id: "0123456789abcdef",
            name: "legacy-v1.md",
            mediaType: "text/markdown",
            url: "https://legacy-v1.example.com/view/#document=v1.legacy",
            createdAt: "2026-09-05T12:00:00.000Z",
          },
        ],
      },
      expectedSettings: {
        siteUrl: "https://legacy-v1.example.com/",
        listDisplayMode: "divided",
      },
      expectedLegacyLink: {
        id: "0123456789abcdef",
        name: "legacy-v1.md",
        parts: [],
      },
    },
    {
      label: "version 2",
      registry: {
        schemaVersion: 2,
        settings: {
          siteUrl: "https://legacy-v2.example.com/",
          listDisplayMode: "all",
        },
        links: [
          {
            id: "00000000-0000-4000-8000-000000000003",
            name: "legacy-v2.md",
            mediaType: "text/markdown",
            url: "https://legacy-v2.example.com/view/#document=v1.legacy",
            createdAt: "2026-09-05T12:00:00.000Z",
            parts: [
              {
                id: "00000000-0000-4000-8000-000000000004",
                title: "Legacy section",
                headingLevel: 1,
                name: "legacy-v2--part-01.md",
                byteLength: 24,
                url: "https://legacy-v2.example.com/view/#document=v1.part",
              },
            ],
          },
        ],
      },
      expectedSettings: {
        siteUrl: "https://legacy-v2.example.com/",
        listDisplayMode: "all",
      },
      expectedLegacyLink: {
        id: "00000000-0000-4000-8000-000000000003",
        name: "legacy-v2.md",
        parts: [
          expect.objectContaining({
            id: "00000000-0000-4000-8000-000000000004",
            title: "Legacy section",
          }),
        ],
      },
    },
  ])(
    "converts a combined $label store in place without losing its settings",
    async ({
      registry: combinedRegistry,
      expectedSettings,
      expectedLegacyLink,
    }) => {
      const directory = await createTemporaryDirectory();
      directories.push(directory);
      const linksPath = join(directory, "legacy.json");
      const configPath = join(directory, "config.json");
      await writeFile(linksPath, JSON.stringify(combinedRegistry), "utf8");

      const session = await createStorageSession(
        { store: linksPath },
        {
          interactive: false,
          output: NOOP_OUTPUT,
          runtime: { environment: {}, homeDirectory: join(directory, "home") },
        },
      );
      expect(session).toBeDefined();
      await session?.registry.upsertLink(SECOND_LINK);

      const storedConfiguration = await readJson(configPath);
      const storedLinks = await readJson(linksPath);
      expect(storedConfiguration).toMatchObject({
        kind: CONFIGURATION_KIND,
        settings: expectedSettings,
      });
      expect(storedLinks).toMatchObject({
        kind: LINKS_FILE_KIND,
        links: [SECOND_LINK, expectedLegacyLink],
      });
      expect(storedLinks).not.toHaveProperty("settings");
    },
  );

  it("rejects corrupt combined data without replacing it or creating configuration", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const linksPath = join(directory, "corrupt.json");
    const configPath = join(directory, "config.json");
    const corruptValue = "{broken";
    await writeFile(linksPath, corruptValue, "utf8");

    const session = await createStorageSession(
      { store: linksPath },
      {
        interactive: false,
        output: NOOP_OUTPUT,
        runtime: { environment: {}, homeDirectory: join(directory, "home") },
      },
    );

    await expect(session?.registry.initialize()).rejects.toThrow(
      "does not contain valid JSON",
    );
    await expect(readFile(linksPath, "utf8")).resolves.toBe(corruptValue);
    await expect(readFile(configPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("uses persisted legacy settings before evaluating environment defaults", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const linksPath = join(directory, "legacy.json");
    await writeFile(
      linksPath,
      JSON.stringify({
        schemaVersion: 2,
        settings: {
          siteUrl: "https://persisted.example.com/",
          listDisplayMode: "all",
        },
        links: [],
      }),
      "utf8",
    );

    const session = await createStorageSession(
      { store: linksPath },
      {
        interactive: false,
        output: NOOP_OUTPUT,
        runtime: {
          environment: { SKILLSLINK_SITE_URL: "not-a-url" },
          homeDirectory: join(directory, "home"),
        },
      },
    );

    await expect(session?.registry.read()).resolves.toMatchObject({
      settings: {
        siteUrl: "https://persisted.example.com/",
        listDisplayMode: "all",
      },
    });
  });

  it("persists the initial site URL from the environment on the first write", async () => {
    const directory = await createTemporaryDirectory();
    directories.push(directory);
    const homeDirectory = join(directory, "home");
    const defaults = resolveDefaultStoragePaths(homeDirectory);
    const session = await createStorageSession(
      {},
      {
        interactive: false,
        output: NOOP_OUTPUT,
        runtime: {
          environment: {
            SKILLSLINK_SITE_URL: "https://custom.example.com/skillslink",
          },
          homeDirectory,
          legacyRegistryFilePath: join(directory, "missing-legacy.json"),
        },
      },
    );

    await session?.registry.upsertLink(FIRST_LINK);

    expect(await readJson(defaults.configFilePath)).toMatchObject({
      linksFile: defaults.linksFilePath,
      settings: {
        siteUrl: "https://custom.example.com/skillslink/",
        listDisplayMode: "divided",
        completeLinks: true,
        dividedLinks: true,
        promptLanguage: "en",
      },
    });
  });

  it("rejects corrupt configuration without replacing either document", async () => {
    const { configPath, linksPath, registry } =
      await createFixture(directories);
    const corruptConfiguration = "{broken";
    const linksDocument = JSON.stringify({
      kind: LINKS_FILE_KIND,
      schemaVersion: LINKS_FILE_SCHEMA_VERSION,
      links: [FIRST_LINK],
    });
    await writeFile(configPath, corruptConfiguration, "utf8");
    await writeFile(linksPath, linksDocument, "utf8");

    await expect(registry.read()).rejects.toThrow(
      "does not contain valid JSON",
    );
    await expect(readFile(configPath, "utf8")).resolves.toBe(
      corruptConfiguration,
    );
    await expect(readFile(linksPath, "utf8")).resolves.toBe(linksDocument);
  });

  it("uses split configuration settings instead of embedded legacy settings", async () => {
    const { configuration, configPath, linksPath, registry } =
      await createFixture(directories, {
        siteUrl: "https://configured.example.com/",
        listDisplayMode: "complete",
      });
    await configuration.ensureInitialized();
    const originalConfiguration = await readFile(configPath, "utf8");
    await writeFile(
      linksPath,
      JSON.stringify({
        schemaVersion: 2,
        settings: {
          siteUrl: "https://legacy.example.com/",
          listDisplayMode: "all",
        },
        links: [FIRST_LINK],
      }),
      "utf8",
    );

    await expect(registry.initialize()).resolves.toMatchObject({
      settings: {
        siteUrl: "https://configured.example.com/",
        listDisplayMode: "complete",
      },
    });
    await expect(readFile(configPath, "utf8")).resolves.toBe(
      originalConfiguration,
    );
    expect(await readJson(linksPath)).toMatchObject({
      kind: LINKS_FILE_KIND,
      links: [FIRST_LINK],
    });
  });

  it("updates settings and links without rewriting the other document", async () => {
    const { configuration, configPath, linksPath, registry } =
      await createFixture(directories);
    await configuration.ensureInitialized();
    await registry.upsertLink(FIRST_LINK);

    const linksBeforeSettingsUpdate = await readFile(linksPath, "utf8");
    await registry.updateSettings({ listDisplayMode: "all" });
    await expect(readFile(linksPath, "utf8")).resolves.toBe(
      linksBeforeSettingsUpdate,
    );

    const configurationBeforeLinkUpdate = await readFile(configPath, "utf8");
    await registry.upsertLink(SECOND_LINK);
    await expect(readFile(configPath, "utf8")).resolves.toBe(
      configurationBeforeLinkUpdate,
    );
    expect(await readJson(linksPath)).toMatchObject({
      links: [SECOND_LINK, FIRST_LINK],
    });
  });
});

const NOOP_OUTPUT: CliOutput = {
  write() {},
  writeError() {},
};

async function createFixture(
  directories: string[],
  settings: RegistrySettings = DEFAULT_SETTINGS,
): Promise<{
  readonly configuration: JsonConfiguration;
  readonly configPath: string;
  readonly linksPath: string;
  readonly registry: JsonRegistry;
}> {
  const directory = await createTemporaryDirectory();
  directories.push(directory);
  const configPath = join(directory, "config.json");
  const linksPath = join(directory, "links.json");
  const defaults: CliConfiguration = {
    kind: CONFIGURATION_KIND,
    schemaVersion: CONFIGURATION_SCHEMA_VERSION,
    linksFile: linksPath,
    settings: {
      ...settings,
      completeLinks: true,
      dividedLinks: true,
      promptLanguage: PROMPT_LANGUAGE,
    },
  };
  const configuration = new JsonConfiguration({
    filePath: configPath,
    defaults,
  });
  return {
    configuration,
    configPath,
    linksPath,
    registry: new JsonRegistry({
      filePath: linksPath,
      configuration,
    }),
  };
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(filePath, "utf8")) as Record<
    string,
    unknown
  >;
}
