import { readFile, writeFile } from "node:fs/promises";

import { selectReleaseVersion } from "./release-version.mjs";

const packageFile = new URL("../packages/cli/package.json", import.meta.url);
const packageMetadata = JSON.parse(await readFile(packageFile, "utf8"));
const releaseVersion = selectReleaseVersion(
  packageMetadata.version,
  process.env.NPM_LATEST_VERSION,
);

packageMetadata.version = releaseVersion;
await writeFile(
  packageFile,
  `${JSON.stringify(packageMetadata, null, 2)}\n`,
  "utf8",
);
process.stdout.write(
  `Prepared @vidigal-code/skillslink@${releaseVersion} for publication.\n`,
);
