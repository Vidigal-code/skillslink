import assert from "node:assert/strict";
import test from "node:test";

import { selectReleaseVersion } from "./release-version.mjs";

test("uses the declared stable version when npm has no release", () => {
  assert.equal(selectReleaseVersion("1.0.0"), "1.0.0");
});

test("uses the declared stable version when it is newer than npm", () => {
  assert.equal(selectReleaseVersion("1.0.0", "0.1.3"), "1.0.0");
});

test("promotes a stable version over the matching prerelease", () => {
  assert.equal(selectReleaseVersion("1.0.0", "1.0.0-rc.1"), "1.0.0");
});

test("increments the published patch after the stable baseline exists", () => {
  assert.equal(selectReleaseVersion("1.0.0", "1.0.0"), "1.0.1");
  assert.equal(selectReleaseVersion("1.0.0", "1.0.0+build-1"), "1.0.1");
  assert.equal(selectReleaseVersion("1.0.0", "1.4.9"), "1.4.10");
});

test("supports version components beyond Number safe integers", () => {
  assert.equal(
    selectReleaseVersion("1.0.0", "1.0.9007199254740992"),
    "1.0.9007199254740993",
  );
});

test("rejects prerelease declarations and malformed npm versions", () => {
  assert.throws(
    () => selectReleaseVersion("1.0.0-beta.1", "0.1.3"),
    /declared package version is not valid semantic versioning/iu,
  );
  assert.throws(
    () => selectReleaseVersion("1.0.0", "latest"),
    /published npm version is not valid semantic versioning/iu,
  );
});
