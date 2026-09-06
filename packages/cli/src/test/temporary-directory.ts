import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const TEMPORARY_DIRECTORY_PREFIX = "skillslink-test-";

export async function createTemporaryDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), TEMPORARY_DIRECTORY_PREFIX));
}

export async function removeTemporaryDirectory(
  directory: string,
): Promise<void> {
  const resolvedDirectory = resolve(directory);
  const resolvedTempRoot = resolve(tmpdir());
  const isGeneratedTestDirectory =
    dirname(resolvedDirectory) === resolvedTempRoot &&
    basename(resolvedDirectory).startsWith(TEMPORARY_DIRECTORY_PREFIX);

  if (!isGeneratedTestDirectory) {
    throw new Error(
      `Refused to remove a test directory outside the temporary area: ${resolvedDirectory}`,
    );
  }

  await rm(resolvedDirectory, { recursive: true, force: true });
}
