import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  DOCUMENT_ID_PATTERN,
  parseDocumentSnapshot,
  type DocumentSnapshot,
} from "@skillslink/link-format";

const SNAPSHOT_FILE_PATTERN = /^[a-f0-9]{16}\.json$/u;
const CONTENT_DIRECTORY = resolve(
  process.env.SKILLSLINK_CONTENT_DIR ??
    resolve(process.cwd(), "..", "..", "content"),
);

export async function getAllDocumentSnapshots(): Promise<
  readonly DocumentSnapshot[]
> {
  let entries: readonly string[];
  try {
    entries = await readdir(CONTENT_DIRECTORY);
  } catch (error) {
    if (isFileSystemError(error, "ENOENT")) {
      return [];
    }
    throw error;
  }

  const snapshots = await Promise.all(
    entries
      .filter((entry) => SNAPSHOT_FILE_PATTERN.test(entry))
      .map((entry) => readSnapshot(resolve(CONTENT_DIRECTORY, entry))),
  );
  return snapshots.sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
  );
}

export async function getDocumentSnapshot(
  documentId: string,
): Promise<DocumentSnapshot | undefined> {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) {
    return undefined;
  }

  try {
    return await readSnapshot(resolve(CONTENT_DIRECTORY, `${documentId}.json`));
  } catch (error) {
    if (isFileSystemError(error, "ENOENT")) {
      return undefined;
    }
    throw error;
  }
}

async function readSnapshot(filePath: string): Promise<DocumentSnapshot> {
  const serialized = await readFile(filePath, "utf8");
  return parseDocumentSnapshot(JSON.parse(serialized) as unknown);
}

function isFileSystemError(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
