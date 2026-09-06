import {
  abbreviatePortableUrl,
  createAiLearningPrompt,
  isRecommendedPortableUrl,
  type PortableLinkDisplayMode,
} from "@skillslink/link-format";

import type { GeneratedLink, GeneratedPartLink } from "../domain/registry";

export interface CliOutput {
  write(message: string): void;
  writeError(message: string): void;
}

export const standardOutput: CliOutput = {
  write(message) {
    process.stdout.write(`${message}\n`);
  },
  writeError(message) {
    process.stderr.write(`${message}\n`);
  },
};

export function formatGeneratedLink(link: GeneratedLink): string {
  const completeLinkLine = isRecommendedPortableUrl(link.url)
    ? `Complete URL: ${abbreviatePortableUrl(link.url, 96)}`
    : "Complete URL: hidden because it exceeds the 8000-character compatibility limit; use the ordered part links.";

  return [
    "AI PROMPT (DIVIDED LINKS)",
    createPrompt(link, "divided"),
    "",
    `Generated from: ${link.name}`,
    `ID: ${link.id}`,
    `Created: ${formatTimestamp(link.createdAt)}`,
    completeLinkLine,
    `Divided links: ${link.parts.length}`,
    ...(link.parts.length === 0 ? [] : [formatPartTable(link.parts)]),
  ].join("\n");
}

export interface FormatLinkListOptions {
  readonly mode?: PortableLinkDisplayMode;
}

export function formatLinkList(
  links: readonly GeneratedLink[],
  options: FormatLinkListOptions = {},
): string {
  if (links.length === 0) {
    return "No URLs are registered.";
  }

  const mode = options.mode ?? "divided";
  const columns = [
    { heading: "ID", width: 18 },
    { heading: "FILE", width: 24 },
    { heading: "CREATED (UTC)", width: 20 },
    { heading: "LINK", width: 42 },
  ] as const;
  const header = columns
    .map((column) => fitCell(column.heading, column.width))
    .join(" | ");
  const divider = columns.map((column) => "-".repeat(column.width)).join("-+-");
  const groups = links.flatMap((link) => {
    const parentRow = [
      fitCell(link.id, columns[0].width),
      fitCell(link.name, columns[1].width),
      fitCell(formatTimestamp(link.createdAt), columns[2].width),
      fitCell(
        isRecommendedPortableUrl(link.url) ? link.url : "DIVIDED LINKS ONLY",
        columns[3].width,
      ),
    ].join(" | ");

    const canUseCompleteLink = isRecommendedPortableUrl(link.url);
    const partTable =
      (mode === "complete" && canUseCompleteLink) || link.parts.length === 0
        ? []
        : [formatPartTable(link.parts)];
    return [
      parentRow,
      ...partTable,
      `  AI PROMPT (${mode.toLocaleUpperCase("en-US")})`,
      indent(createPrompt(link, mode), "  "),
    ];
  });

  return [header, divider, ...groups].join("\n");
}

export function abbreviate(value: string, maximumLength: number): string {
  const normalized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127 ? " " : character;
  })
    .join("")
    .trim();
  if (normalized.length <= maximumLength) {
    return normalized;
  }

  const ellipsis = "...";
  if (maximumLength <= ellipsis.length) {
    return ellipsis.slice(0, Math.max(0, maximumLength));
  }

  return `${normalized.slice(0, maximumLength - ellipsis.length)}${ellipsis}`;
}

export function formatTimestamp(value: string): string {
  return new Date(value).toISOString().replace(/\.\d{3}Z$/u, "Z");
}

function fitCell(value: string, width: number): string {
  return abbreviate(value, width).padEnd(width);
}

function formatPartTable(parts: readonly GeneratedPartLink[]): string {
  const columns = [
    { heading: "PART ID", width: 18 },
    { heading: "TITLE", width: 24 },
    { heading: "BYTES", width: 8 },
    { heading: "LINK", width: 42 },
  ] as const;
  const prefix = "  ";
  const header = columns
    .map((column) => fitCell(column.heading, column.width))
    .join(" | ");
  const divider = columns.map((column) => "-".repeat(column.width)).join("-+-");
  const rows = parts.map((part) =>
    [
      fitCell(part.id, columns[0].width),
      fitCell(part.title, columns[1].width),
      fitCell(String(part.byteLength), columns[2].width),
      fitCell(part.url, columns[3].width),
    ].join(" | "),
  );

  return [
    `${prefix}PARTS (${parts.length})`,
    `${prefix}${header}`,
    `${prefix}${divider}`,
    ...rows.map((row) => `${prefix}${row}`),
  ].join("\n");
}

function createPrompt(
  link: GeneratedLink,
  mode: PortableLinkDisplayMode,
): string {
  return createAiLearningPrompt(
    {
      fullUrl: link.url,
      partUrls: link.parts.map((part) => part.url),
    },
    mode,
  );
}

function indent(value: string, prefix: string): string {
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}
