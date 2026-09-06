import type { List, Nodes, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { LinkFormatError } from "./errors";
import {
  MAX_DOCUMENT_PART_BYTES,
  MAX_DOCUMENT_PARTS,
  type MarkdownHeadingLevel,
  type SharedDocument,
  type SharedDocumentPart,
} from "./model";
import { parseSharedDocument } from "./validation";

const markdownParser = unified().use(remarkParse).use(remarkGfm);
const textEncoder = new TextEncoder();
const MAXIMUM_TITLE_LENGTH = 80;

interface DocumentSegment {
  readonly title: string;
  readonly headingLevel: MarkdownHeadingLevel | null;
  readonly content: string;
}

interface MarkdownBoundary {
  readonly offset: number;
  readonly title: string;
  readonly headingLevel: MarkdownHeadingLevel | null;
}

export function createDocumentParts(
  value: SharedDocument,
): readonly SharedDocumentPart[] {
  const document = parseSharedDocument(value);
  const semanticSegments = createSemanticSegments(document.content);
  const sourceSegments =
    semanticSegments.length > 0
      ? semanticSegments
      : [
          {
            title: "Document",
            headingLevel: null,
            content: document.content,
          },
        ];
  let chunks: readonly DocumentSegment[] = sourceSegments.flatMap((segment) =>
    splitSegment(segment, MAX_DOCUMENT_PART_BYTES),
  );

  if (chunks.length > MAX_DOCUMENT_PARTS) {
    chunks = createBoundedFallbackSegments(document.content);
  }
  if (chunks.length > MAX_DOCUMENT_PARTS) {
    throw new LinkFormatError(
      "INVALID_DOCUMENT",
      `The document creates more than ${MAX_DOCUMENT_PARTS} link parts.`,
    );
  }

  return chunks.map((segment, index) => {
    const partDocument = parseSharedDocument({
      name: `p${index + 1}.md`,
      mediaType: document.mediaType,
      content: segment.content,
    });
    return {
      title: segment.title,
      headingLevel: segment.headingLevel,
      byteLength: getUtf8ByteLength(segment.content),
      document: partDocument,
    };
  });
}

function createSemanticSegments(content: string): readonly DocumentSegment[] {
  const tree = markdownParser.parse(content);
  const boundaries = tree.children
    .flatMap(expandSemanticNode)
    .map((node, index) => createBoundary(node, index))
    .filter((value): value is MarkdownBoundary => value !== undefined)
    .sort((left, right) => left.offset - right.offset);

  if (boundaries.length === 0) {
    return [];
  }

  const values: DocumentSegment[] = [];
  const firstBoundary = boundaries[0];
  if (firstBoundary !== undefined && firstBoundary.offset > 0) {
    values.push({
      title: "Introduction",
      headingLevel: null,
      content: content.slice(0, firstBoundary.offset),
    });
  }

  boundaries.forEach((boundary, index) => {
    const nextOffset = boundaries[index + 1]?.offset ?? content.length;
    if (nextOffset > boundary.offset) {
      values.push({
        title: boundary.title,
        headingLevel: boundary.headingLevel,
        content: content.slice(boundary.offset, nextOffset),
      });
    }
  });
  return values;
}

function expandSemanticNode(node: RootContent): readonly RootContent[] {
  if (node.type !== "list") {
    return [node];
  }

  return (node as List).children;
}

function createBoundary(
  node: RootContent,
  index: number,
): MarkdownBoundary | undefined {
  const offset = node.position?.start.offset;
  if (offset === undefined) {
    return undefined;
  }

  const headingLevel =
    node.type === "heading" && node.depth <= 3
      ? (node.depth as MarkdownHeadingLevel)
      : null;
  return {
    offset,
    title: createNodeTitle(node, index),
    headingLevel,
  };
}

function createNodeTitle(node: RootContent, index: number): string {
  const preview = normalizeTitle(extractNodeText(node));
  if (preview.length > 0) {
    return preview;
  }

  const labelByType: Readonly<Record<string, string>> = {
    blockquote: "Block quote",
    break: "Line break",
    code: "Code block",
    definition: "Link definition",
    footnoteDefinition: "Footnote",
    heading: "Untitled heading",
    html: "HTML block",
    listItem: "List item",
    paragraph: "Paragraph",
    table: "Table",
    thematicBreak: "Divider",
    toml: "TOML block",
    yaml: "YAML block",
  };
  return labelByType[node.type] ?? `Markdown block ${index + 1}`;
}

function extractNodeText(node: Nodes): string {
  if ("value" in node && typeof node.value === "string") {
    if (node.type === "code" && node.lang !== null && node.lang !== undefined) {
      return `Code (${node.lang})`;
    }
    return node.value;
  }
  if ("alt" in node && typeof node.alt === "string") {
    return node.alt;
  }
  if ("children" in node) {
    return node.children.map(extractNodeText).join(" ");
  }
  if ("identifier" in node && typeof node.identifier === "string") {
    return node.identifier;
  }
  return "";
}

function normalizeTitle(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length <= MAXIMUM_TITLE_LENGTH
    ? normalized
    : `${normalized.slice(0, MAXIMUM_TITLE_LENGTH - 3)}...`;
}

function splitSegment(
  segment: DocumentSegment,
  maximumBytes: number,
): readonly DocumentSegment[] {
  const chunks = splitTextByUtf8Bytes(segment.content, maximumBytes);
  return chunks.map((content, index) => ({
    title:
      chunks.length === 1
        ? segment.title
        : `${segment.title} (${index + 1}/${chunks.length})`,
    headingLevel: segment.headingLevel,
    content,
  }));
}

function createBoundedFallbackSegments(
  content: string,
): readonly DocumentSegment[] {
  const totalBytes = getUtf8ByteLength(content);
  let targetBytes = Math.max(1, Math.ceil(totalBytes / MAX_DOCUMENT_PARTS));
  let chunks = splitTextByUtf8Bytes(content, targetBytes);

  while (
    chunks.length > MAX_DOCUMENT_PARTS &&
    targetBytes < MAX_DOCUMENT_PART_BYTES
  ) {
    targetBytes += 1;
    chunks = splitTextByUtf8Bytes(content, targetBytes);
  }

  return chunks.map((chunk, index) => ({
    title: `Document part ${index + 1}`,
    headingLevel: null,
    content: chunk,
  }));
}

function splitTextByUtf8Bytes(
  content: string,
  maximumBytes: number,
): readonly string[] {
  if (getUtf8ByteLength(content) <= maximumBytes) {
    return [content];
  }

  const preferredUnits = createMarkdownBlocks(content).flatMap((block) =>
    getUtf8ByteLength(block) <= maximumBytes
      ? [block]
      : splitLines(block).flatMap((line) =>
          getUtf8ByteLength(line) <= maximumBytes
            ? [line]
            : splitSentences(line).flatMap((sentence) =>
                getUtf8ByteLength(sentence) <= maximumBytes
                  ? [sentence]
                  : splitSymbols(sentence, maximumBytes),
              ),
        ),
  );
  return packUnits(preferredUnits, maximumBytes);
}

function createMarkdownBlocks(content: string): readonly string[] {
  const blocks: string[] = [];
  let current = "";

  for (const line of splitLines(content)) {
    current += line;
    if (line.replace(/\r?\n$/u, "").trim().length === 0) {
      blocks.push(current);
      current = "";
    }
  }

  if (current.length > 0) {
    blocks.push(current);
  }
  return blocks;
}

function splitSentences(content: string): readonly string[] {
  const symbols = Array.from(content);
  const sentences: string[] = [];
  let current = "";

  for (let index = 0; index < symbols.length; index += 1) {
    const symbol = symbols[index] ?? "";
    current += symbol;

    if (!isSentencePunctuation(symbol)) {
      continue;
    }

    while (isSentencePunctuation(symbols[index + 1] ?? "")) {
      index += 1;
      current += symbols[index] ?? "";
    }

    const nextSymbol = symbols[index + 1];
    if (nextSymbol !== undefined && !/^\s$/u.test(nextSymbol)) {
      continue;
    }

    while (
      symbols[index + 1] !== undefined &&
      /^\s$/u.test(symbols[index + 1] ?? "")
    ) {
      index += 1;
      current += symbols[index] ?? "";
    }
    sentences.push(current);
    current = "";
  }

  if (current.length > 0) {
    sentences.push(current);
  }
  return sentences.length > 0 ? sentences : [content];
}

function isSentencePunctuation(value: string): boolean {
  return value === "." || value === "!" || value === "?";
}

function splitSymbols(
  content: string,
  maximumBytes: number,
): readonly string[] {
  const values: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const symbol of content) {
    const symbolBytes = getUtf8ByteLength(symbol);
    if (currentBytes > 0 && currentBytes + symbolBytes > maximumBytes) {
      values.push(current);
      current = "";
      currentBytes = 0;
    }
    current += symbol;
    currentBytes += symbolBytes;
  }

  if (current.length > 0) {
    values.push(current);
  }
  return values;
}

function packUnits(
  units: readonly string[],
  maximumBytes: number,
): readonly string[] {
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const unit of units) {
    const unitBytes = getUtf8ByteLength(unit);
    if (currentBytes > 0 && currentBytes + unitBytes > maximumBytes) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += unit;
    currentBytes += unitBytes;
  }

  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

function splitLines(content: string): readonly string[] {
  return content.match(/[^\n]*\n|[^\n]+$/gu) ?? [];
}

function getUtf8ByteLength(value: string): number {
  return textEncoder.encode(value).byteLength;
}
