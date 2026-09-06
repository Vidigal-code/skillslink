const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const PUBLISHED_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

export function selectReleaseVersion(declaredVersion, publishedVersion) {
  const declared = parseVersion(
    declaredVersion,
    STABLE_VERSION_PATTERN,
    "The declared package version",
  );
  const normalizedPublishedVersion = publishedVersion?.trim();

  if (
    normalizedPublishedVersion === undefined ||
    normalizedPublishedVersion === ""
  ) {
    return declared.value;
  }

  const published = parseVersion(
    normalizedPublishedVersion,
    PUBLISHED_VERSION_PATTERN,
    "The published npm version",
  );
  const comparison = compareCoreVersions(declared.parts, published.parts);

  if (comparison > 0 || (comparison === 0 && published.prerelease)) {
    return declared.value;
  }

  const [major, minor, patch] = published.parts;
  return `${major}.${minor}.${patch + 1n}`;
}

function compareCoreVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] > right[index]) {
      return 1;
    }
    if (left[index] < right[index]) {
      return -1;
    }
  }
  return 0;
}

function parseVersion(value, pattern, label) {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string.`);
  }

  const match = pattern.exec(value);
  if (match === null) {
    throw new Error(`${label} is not valid semantic versioning: ${value}`);
  }

  return {
    value,
    parts: match.slice(1, 4).map((part) => BigInt(part)),
    prerelease: match[4] !== undefined,
  };
}
