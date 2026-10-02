import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  createRawDocumentUrl,
  type DocumentSnapshot,
} from "@skillslink/link-format";

import { getAllDocumentSnapshots } from "../src/entities/shared-document/index.server";
import {
  createCanonicalDocumentUrl,
  SITE_URL,
} from "../src/shared/config/site";

const RAW_FILE_PATTERN = /^[a-f0-9]{16}\.md$/u;
const LLMS_INDEX_HEADER = [
  "# SkillsLink",
  "",
  "> Static, AI-readable Markdown documents hosted by this SkillsLink repository.",
  "",
  "## Documents",
  "",
] as const;
const EMPTY_LLMS_INDEX_ENTRY = "No repository documents are available yet.";
const publicDirectory = resolve(process.cwd(), "public");
const rawDirectory = resolve(publicDirectory, "raw");
const llmsFilePath = resolve(publicDirectory, "llms.txt");

await prepareContent();

async function prepareContent(): Promise<void> {
  const snapshots = await getAllDocumentSnapshots();
  await mkdir(rawDirectory, { recursive: true });
  await removeStaleRawFiles();
  await Promise.all(snapshots.map(writeRawDocument));
  await writeFile(llmsFilePath, createLlmsIndex(snapshots), "utf8");
  process.stdout.write(
    `Prepared ${snapshots.length} AI-readable document(s).\n`,
  );
}

async function removeStaleRawFiles(): Promise<void> {
  const entries = await readdir(rawDirectory);
  await Promise.all(
    entries
      .filter((entry) => RAW_FILE_PATTERN.test(entry))
      .map((entry) => unlink(resolve(rawDirectory, entry))),
  );
}

async function writeRawDocument(snapshot: DocumentSnapshot): Promise<void> {
  await writeFile(
    resolve(rawDirectory, `${snapshot.id}.md`),
    snapshot.document.content,
    "utf8",
  );
}

function createLlmsIndex(snapshots: readonly DocumentSnapshot[]): string {
  const entries =
    snapshots.length === 0
      ? [EMPTY_LLMS_INDEX_ENTRY]
      : snapshots.flatMap(createLlmsIndexEntry);

  return `${[...LLMS_INDEX_HEADER, ...entries].join("\n")}\n`;
}

function createLlmsIndexEntry(snapshot: DocumentSnapshot): readonly string[] {
  const htmlUrl = createCanonicalDocumentUrl(snapshot.id);
  const rawUrl = createRawDocumentUrl({
    siteUrl: SITE_URL,
    documentId: snapshot.id,
    mediaType: snapshot.document.mediaType,
  });

  return [
    `- [${escapeMarkdownLabel(snapshot.document.name)}](${htmlUrl})`,
    `  - Raw: ${rawUrl}`,
  ];
}

function escapeMarkdownLabel(value: string): string {
  return value.replaceAll("[", String.raw`\[`).replaceAll("]", String.raw`\]`);
}
