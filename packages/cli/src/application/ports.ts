import type { SharedDocument } from "@skillslink/link-format";

import type {
  GeneratedLink,
  LinkRegistry,
  RegistrySettings,
} from "../domain/registry";

export interface DocumentSourceReader {
  read(filePath: string): Promise<SharedDocument>;
}

export interface DocumentDestinationWriter {
  write(
    document: SharedDocument,
    directoryPath: string,
    options: { readonly overwrite: boolean },
  ): Promise<string>;
}

export interface RegistryRepository {
  readonly filePath: string;
  read(): Promise<LinkRegistry>;
  updateSettings(settings: Partial<RegistrySettings>): Promise<LinkRegistry>;
  upsertLink(link: GeneratedLink): Promise<LinkRegistry>;
  removeLink(documentId: string): Promise<GeneratedLink | undefined>;
}

export type Clock = () => Date;

export type IdentifierGenerator = () => string;
