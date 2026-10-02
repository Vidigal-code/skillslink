import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { DocumentSnapshot } from "@skillslink/link-format";

import { getAllDocumentSnapshots } from "../src/entities/shared-document/index.server";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
} from "../src/features/select-theme/model/theme";
import {
  PUBLIC_BASE_PATH,
  SITE_ICON_FILE,
  SITE_ICON_PATH,
} from "../src/shared/config/site";
import { LANGUAGE_CODES } from "../src/shared/i18n";
import { STATIC_PAGE_ROUTES } from "../src/shared/routing";

const RAW_DOCUMENT_EXTENSION = "md";
const MARKDOWN_HEADING_PREFIX = /^#{1,6}\s+/u;
const outputDirectory = resolve(process.cwd(), "out");

await verifyExport();

async function verifyExport(): Promise<void> {
  await verifyLocaleRoutes();
  const snapshots = await getAllDocumentSnapshots();
  const llmsIndex = await readOutput("llms.txt");

  for (const snapshot of snapshots) {
    await verifySnapshot(snapshot, llmsIndex);
  }

  process.stdout.write(
    `Verified ${LANGUAGE_CODES.length} locales and ${snapshots.length} static document(s).\n`,
  );
}

async function verifyLocaleRoutes(): Promise<void> {
  const defaultHome = await readOutput("index.html");

  assertIncludes(defaultHome, `href="${SITE_ICON_PATH}"`, "browser icon path");
  assertIncludes(defaultHome, `src="${SITE_ICON_PATH}"`, "visible logo path");
  assertIncludes(
    defaultHome,
    `localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})`,
    "persisted theme bootstrap",
  );
  assertIncludes(
    await readOutput(SITE_ICON_FILE),
    "<title",
    "exported SkillsLink icon",
  );

  if (PUBLIC_BASE_PATH !== "") {
    assertIncludes(
      defaultHome,
      `${PUBLIC_BASE_PATH}/_next/`,
      "configured Next.js base path",
    );
  }

  for (const route of STATIC_PAGE_ROUTES) {
    await readOutput(route, "index.html");
  }

  for (const language of LANGUAGE_CODES) {
    const home = await readOutput(language, "index.html");
    assertIncludes(
      home,
      `<html lang="${language}" data-theme="${DEFAULT_THEME}">`,
      `${language} HTML language and default theme`,
    );

    for (const route of STATIC_PAGE_ROUTES) {
      await readOutput(language, route, "index.html");
    }
  }
}

async function verifySnapshot(
  snapshot: DocumentSnapshot,
  llmsIndex: string,
): Promise<void> {
  const rawFileName = `${snapshot.id}.${RAW_DOCUMENT_EXTENSION}`;
  assertEqual(
    await readOutput("raw", rawFileName),
    snapshot.document.content,
    `${snapshot.id} raw source`,
  );

  const firstTextLine = findFirstTextLine(snapshot.document.content);
  const documentRoutes = [
    ["d", snapshot.id, "index.html"],
    ...LANGUAGE_CODES.map((language) => [
      language,
      "d",
      snapshot.id,
      "index.html",
    ]),
  ];

  for (const route of documentRoutes) {
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
    `/raw/${rawFileName}`,
    `${snapshot.id} raw index entry`,
  );
}

function findFirstTextLine(content: string): string | undefined {
  return content
    .split("\n")
    .map((line) => line.replace(MARKDOWN_HEADING_PREFIX, "").trim())
    .find((line) => line.length > 0);
}

function readOutput(...segments: readonly string[]): Promise<string> {
  return readFile(resolve(outputDirectory, ...segments), "utf8");
}

function assertIncludes(
  value: string,
  expected: string,
  subject: string,
): void {
  if (!value.includes(expected)) {
    throw new Error(`${subject} is missing ${JSON.stringify(expected)}.`);
  }
}

function assertEqual(actual: string, expected: string, subject: string): void {
  if (actual !== expected) {
    throw new Error(`${subject} does not match the repository snapshot.`);
  }
}
