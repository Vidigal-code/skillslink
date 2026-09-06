import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveDefaultStoragePaths } from "../src/config/runtime-config";

describe("default storage paths", () => {
  it.each([
    {
      homeDirectory: "C:\\Users\\Alex",
      label: "Windows",
      pathResolver: path.win32,
    },
    {
      homeDirectory: "/Users/alex",
      label: "macOS",
      pathResolver: path.posix,
    },
    {
      homeDirectory: "/home/alex",
      label: "Linux",
      pathResolver: path.posix,
    },
  ])(
    "uses the home .skillslink directory on $label",
    ({ homeDirectory, pathResolver }) => {
      const applicationDirectory = pathResolver.resolve(
        homeDirectory,
        ".skillslink",
      );

      expect(resolveDefaultStoragePaths(homeDirectory, pathResolver)).toEqual({
        configFilePath: pathResolver.resolve(
          applicationDirectory,
          "config.json",
        ),
        configLocationFilePath: pathResolver.resolve(
          applicationDirectory,
          "active-config.json",
        ),
        linksFilePath: pathResolver.resolve(applicationDirectory, "links.json"),
      });
    },
  );
});
