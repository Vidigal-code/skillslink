import { readFile, writeFile } from "node:fs/promises";

const packageFile = new URL("../packages/cli/package.json", import.meta.url);
const runNumber = readPositiveInteger("GITHUB_RUN_NUMBER");
const runAttempt = readPositiveInteger("GITHUB_RUN_ATTEMPT");
const releaseVersion = `0.${runNumber}.${runAttempt}`;
const packageMetadata = JSON.parse(await readFile(packageFile, "utf8"));

packageMetadata.version = releaseVersion;
await writeFile(
  packageFile,
  `${JSON.stringify(packageMetadata, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`Prepared @vidigal-code/skillslink@${releaseVersion}\n`);

function readPositiveInteger(name) {
  const value = process.env[name];
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}
