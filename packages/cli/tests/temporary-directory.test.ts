import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from "../src/test/temporary-directory";

describe("temporary test directory safety", () => {
  it("removes a directory created by the SkillsLink test helper", async () => {
    const directory = await createTemporaryDirectory();
    await writeFile(join(directory, "marker.txt"), "temporary", "utf8");

    await removeTemporaryDirectory(directory);

    await expect(access(directory)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a temporary directory without the generated prefix", async () => {
    const unrelatedTemporaryPath = await mkdtemp(
      join(tmpdir(), "unrelated-test-directory-"),
    );

    try {
      await expect(
        removeTemporaryDirectory(unrelatedTemporaryPath),
      ).rejects.toThrow("Refused to remove a test directory outside");
      await expect(access(unrelatedTemporaryPath)).resolves.toBeUndefined();
    } finally {
      await rm(unrelatedTemporaryPath, { recursive: true, force: true });
    }
  });

  it("rejects a path outside the operating system temporary directory", async () => {
    const outsideDirectory = await mkdtemp(
      join(resolve("."), ".temporary-directory-safety-"),
    );

    try {
      await expect(removeTemporaryDirectory(outsideDirectory)).rejects.toThrow(
        "Refused to remove a test directory outside",
      );
      await expect(access(outsideDirectory)).resolves.toBeUndefined();
    } finally {
      await rm(outsideDirectory, { recursive: true, force: true });
    }
  });
});
