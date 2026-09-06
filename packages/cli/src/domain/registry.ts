import type {
  DocumentMediaType,
  MarkdownHeadingLevel,
  PortableLinkDisplayMode,
} from "@skillslink/link-format";

export const REGISTRY_SCHEMA_VERSION = 2 as const;
export const DEFAULT_SITE_URL = "https://vidigal-code.github.io/skillslink/";
export const DEFAULT_LIST_DISPLAY_MODE = "divided" as const;

export interface RegistrySettings {
  readonly siteUrl: string;
  readonly listDisplayMode: PortableLinkDisplayMode;
}

export interface GeneratedPartLink {
  readonly id: string;
  readonly title: string;
  readonly headingLevel: MarkdownHeadingLevel | null;
  readonly name: string;
  readonly byteLength: number;
  readonly url: string;
}

export interface GeneratedLink {
  readonly id: string;
  readonly name: string;
  readonly mediaType: DocumentMediaType;
  readonly url: string;
  readonly createdAt: string;
  readonly parts: readonly GeneratedPartLink[];
}

export interface RegisteredLinkTarget {
  readonly kind: "document" | "part";
  readonly id: string;
  readonly parentId: string;
  readonly name: string;
  readonly title: string;
  readonly url: string;
  readonly createdAt: string;
}

export interface LinkRegistry {
  readonly schemaVersion: typeof REGISTRY_SCHEMA_VERSION;
  readonly settings: RegistrySettings;
  readonly links: readonly GeneratedLink[];
}
