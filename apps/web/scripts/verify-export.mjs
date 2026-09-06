import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const LANGUAGE_CODES = ["en", "pt", "es"];
const SNAPSHOT_FILE_PATTERN = /^[a-f0-9]{16}\.json$/u;
const applicationDirectory = process.cwd();
const repositoryDirectory = resolve(applicationDirectory, "..", "..");
const outputDirectory = resolve(applicationDirectory, "out");
const contentDirectory = resolve(repositoryDirectory, "content");

await verifyExport();

async function verifyExport() {
  await verifyLocaleRoutes();
  const snapshots = await readSnapshots();
  const llmsIndex = await readOutput("llms.txt");

  for (const snapshot of snapshots) {
    await verifySnapshot(snapshot, llmsIndex);
  }

  process.stdout.write(
    `Verified ${LANGUAGE_CODES.length} locales and ${snapshots.length} static document(s).\n`,
  );
}

async function verifyLocaleRoutes() {
  const defaultHome = await readOutput("index.html");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH;
  const normalizedBasePath =
    basePath === undefined || basePath === "" || basePath === "/"
      ? ""
      : `/${basePath.replace(/^\/+|\/+$/gu, "")}`;
  const iconPath = `${normalizedBasePath}/icon/skillslink-icon.svg`;

  assertIncludes(defaultHome, `href="${iconPath}"`, "browser icon path");
  assertIncludes(defaultHome, `src="${iconPath}"`, "visible logo path");
  assertIncludes(
    defaultHome,
    'localStorage.getItem("skillslink:theme")',
    "persisted theme bootstrap",
  );
  assertIncludes(
    await readOutput("icon", "skillslink-icon.svg"),
    "<title",
    "exported SkillsLink icon",
  );

  if (basePath) {
    assertIncludes(
      defaultHome,
      `${basePath}/_next/`,
      "configured Next.js base path",
    );
  }

  for (const language of LANGUAGE_CODES) {
    const home = await readOutput(language, "index.html");
    assertIncludes(
      home,
      `<html lang="${language}" data-theme="dark">`,
      `${language} HTML language and default theme`,
    );

    for (const route of ["about", "upload", "view"]) {
      await readOutput(language, route, "index.html");
    }
  }

  for (const route of [
    "about/index.html",
    "upload/index.html",
    "view/index.html",
  ]) {
    await readOutput(...route.split("/"));
  }
}

async function readSnapshots() {
  const files = (await readdir(contentDirectory)).filter((fileName) =>
    SNAPSHOT_FILE_PATTERN.test(fileName),
  );
  return Promise.all(
    files.map(async (fileName) =>
      JSON.parse(await readFile(resolve(contentDirectory, fileName), "utf8")),
    ),
  );
}

async function verifySnapshot(snapshot, llmsIndex) {
  const extension = "md";
  const rawDocument = await readOutput("raw", `${snapshot.id}.${extension}`);
  assertEqual(
    rawDocument,
    snapshot.document.content,
    `${snapshot.id} raw source`,
  );

  const firstTextLine = snapshot.document.content
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/u, "").trim())
    .find((line) => line.length > 0);
  const routes = [
    ["d", snapshot.id, "index.html"],
    ...LANGUAGE_CODES.map((language) => [
      language,
      "d",
      snapshot.id,
      "index.html",
    ]),
  ];

  for (const route of routes) {
    const html = await readOutput(...route);
    assertIncludes(
      html,
      snapshot.document.name,
      `${snapshot.id} document name`,
    );
    if (firstTextLine !== undefined) {
      assertIncludes(html, firstTextLine, `${snapshot.id} rendered content`);
    }
  }

  assertIncludes(
    llmsIndex,
    `/d/${snapshot.id}/`,
    `${snapshot.id} HTML index entry`,
  );
  assertIncludes(
    llmsIndex,
    `/raw/${snapshot.id}.${extension}`,
    `${snapshot.id} raw index entry`,
  );
}

function readOutput(...segments) {
  return readFile(resolve(outputDirectory, ...segments), "utf8");
}

function assertIncludes(value, expected, subject) {
  if (!value.includes(expected)) {
    throw new Error(`${subject} is missing ${JSON.stringify(expected)}.`);
  }
}

function assertEqual(actual, expected, subject) {
  if (actual !== expected) {
    throw new Error(`${subject} does not match the repository snapshot.`);
  }
}
