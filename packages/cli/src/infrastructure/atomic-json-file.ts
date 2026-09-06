import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export interface AtomicJsonWriteOptions {
  readonly filePath: string;
  readonly value: unknown;
  readonly mode: number;
}

export async function writeJsonAtomically(
  options: AtomicJsonWriteOptions,
): Promise<void> {
  const directory = dirname(options.filePath);
  const temporaryPath = join(
    directory,
    `.${basename(options.filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryPath, serializeJson(options.value), {
      encoding: "utf8",
      mode: options.mode,
    });
    await rename(temporaryPath, options.filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
