import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  createRawDocumentUrl,
  parseDocumentSnapshot,
  type DocumentSnapshot,
} from "@skillslink/link-format";
import {
  createCanonicalDocumentUrl,
  SITE_URL,
} from "../src/shared/config/site";

const SNAPSHOT_FILE_PATTERN = /^[a-f0-9]{16}\.json$/u;
const RAW_FILE_PATTERN = /^[a-f0-9]{16}\.md$/u;
const contentDirectory = resolve(
  process.env.SKILLSLINK_CONTENT_DIR ??
    resolve(process.cwd(), "..", "..", "content"),
);
const publicDirectory = resolve(process.cwd(), "public");
const rawDirectory = resolve(publicDirectory, "raw");
const llmsFilePath = resolve(publicDirectory, "llms.txt");

await prepareContent();

async function prepareContent(): Promise<void> {
  const snapshots = await readSnapshots();
  await mkdir(rawDirectory, { recursive: true });
  await removeStaleRawFiles();
  await Promise.all(snapshots.map(writeRawDocument));
  await writeFile(llmsFilePath, createLlmsIndex(snapshots), "utf8");
  process.stdout.write(
    `Prepared ${snapshots.length} AI-readable document(s).\n`,
  );
}

async function readSnapshots(): Promise<readonly DocumentSnapshot[]> {
  let entries: readonly string[];
  try {
    entries = await readdir(contentDirectory);
  } catch (error) {
    if (isFileSystemError(error, "ENOENT")) {
      return [];
    }
    throw error;
  }

  const snapshotFiles = entries.filter((entry) =>
    SNAPSHOT_FILE_PATTERN.test(entry),
  );
  const snapshots = await Promise.all(
    snapshotFiles.map(async (fileName) => {
      const serialized = await readFile(
        resolve(contentDirectory, fileName),
        "utf8",
      );
      return parseDocumentSnapshot(JSON.parse(serialized) as unknown);
    }),
  );
  return snapshots.sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
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
  const lines = [
    "# SkillsLink",
    "",
    "> Static, AI-readable Markdown documents hosted by this SkillsLink repository.",
    "",
    "## Documents",
    "",
  ];

  if (snapshots.length === 0) {
    lines.push("No repository documents are available yet.");
  } else {
    for (const snapshot of snapshots) {
      const rawUrl = createRawDocumentUrl({
        siteUrl: SITE_URL,
        documentId: snapshot.id,
        mediaType: snapshot.document.mediaType,
      });
      const htmlUrl = createCanonicalDocumentUrl(snapshot.id);
      lines.push(
        `- [${escapeMarkdownLabel(snapshot.document.name)}](${htmlUrl})`,
      );
      lines.push(`  - Raw: ${rawUrl}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function escapeMarkdownLabel(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function isFileSystemError(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
