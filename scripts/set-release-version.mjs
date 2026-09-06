import { appendFile, readFile, writeFile } from "node:fs/promises";

const packageFile = new URL("../packages/cli/package.json", import.meta.url);
const runNumber = readPositiveInteger("GITHUB_RUN_NUMBER");
const releaseVersion = `0.1.${runNumber}`;
const latestVersion = process.env.NPM_LATEST_VERSION?.trim();
const shouldPublish =
  latestVersion === undefined ||
  latestVersion.length === 0 ||
  compareVersions(releaseVersion, latestVersion) > 0;
const packageMetadata = JSON.parse(await readFile(packageFile, "utf8"));

packageMetadata.version = releaseVersion;
await writeFile(
  packageFile,
  `${JSON.stringify(packageMetadata, null, 2)}\n`,
  "utf8",
);
if (process.env.GITHUB_OUTPUT !== undefined) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `version=${releaseVersion}\npublish=${String(shouldPublish)}\n`,
    "utf8",
  );
}
process.stdout.write(
  `Prepared @vidigal-code/skillslink@${releaseVersion}; publish: ${String(shouldPublish)}\n`,
);

function readPositiveInteger(name) {
  const value = process.env[name];
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function compareVersions(left, right) {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  for (let index = 0; index < leftVersion.parts.length; index += 1) {
    const difference = leftVersion.parts[index] - rightVersion.parts[index];
    if (difference !== 0) {
      return difference;
    }
  }
  return Number(rightVersion.prerelease) - Number(leftVersion.prerelease);
}

function parseVersion(value) {
  const match =
    /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.exec(value);
  if (match === null) {
    throw new Error(`NPM_LATEST_VERSION is not valid semver: ${value}`);
  }
  const parts = match.slice(1, 4).map((part) => Number(part));
  if (parts.some((part) => !Number.isSafeInteger(part))) {
    throw new Error(
      `NPM_LATEST_VERSION is outside the supported range: ${value}`,
    );
  }
  return { parts, prerelease: match[4] !== undefined };
}
