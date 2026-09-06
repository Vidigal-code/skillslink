import { unzlibSync, zlibSync } from "fflate";

import { LinkFormatError } from "./errors";
import {
  LINK_FORMAT_VERSION,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_NAME_LENGTH,
  type SharedDocument,
} from "./model";
import { parseLegacyEncodedEnvelope, parseSharedDocument } from "./validation";

const PAYLOAD_PREFIX = `v${LINK_FORMAT_VERSION}.`;
const LEGACY_PAYLOAD_PREFIX = "v1.";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const BINARY_CHUNK_SIZE = 32_768;
const FORMAT_HEADER_BYTES = 4;
const DOCUMENT_NAME_LENGTH_BYTES = 2;
const MAXIMUM_UTF8_BYTES_PER_CODE_UNIT = 4;
const MAXIMUM_JSON_ESCAPE_BYTES_PER_CODE_UNIT = 6;
const MAXIMUM_COMPACT_DOCUMENT_BYTES =
  DOCUMENT_NAME_LENGTH_BYTES +
  MAX_DOCUMENT_NAME_LENGTH * MAXIMUM_UTF8_BYTES_PER_CODE_UNIT +
  MAX_DOCUMENT_BYTES;
const RAW_MODE = 0;
const ZLIB_MODE = 1;
const COMPRESSION_LEVEL = 9 as const;
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const textEncoder = new TextEncoder();
const EMPTY_LEGACY_ENVELOPE_BYTES = textEncoder.encode(
  JSON.stringify({ v: 1, n: "", m: "text/markdown", c: "" }),
).byteLength;
const MAXIMUM_LEGACY_ENVELOPE_BYTES =
  EMPTY_LEGACY_ENVELOPE_BYTES +
  (MAX_DOCUMENT_NAME_LENGTH + MAX_DOCUMENT_BYTES) *
    MAXIMUM_JSON_ESCAPE_BYTES_PER_CODE_UNIT;
const MAXIMUM_COMPACT_PAYLOAD_CHARACTERS = getBase64UrlLength(
  FORMAT_HEADER_BYTES + MAXIMUM_COMPACT_DOCUMENT_BYTES,
);
const MAXIMUM_LEGACY_PAYLOAD_CHARACTERS = getBase64UrlLength(
  MAXIMUM_LEGACY_ENVELOPE_BYTES,
);

export function encodeDocumentPayload(document: SharedDocument): string {
  const validDocument = parseSharedDocument(document);
  const compactDocument = encodeCompactDocument(validDocument);
  const compressedDocument = zlibSync(compactDocument, {
    level: COMPRESSION_LEVEL,
  });
  const useCompression =
    compressedDocument.byteLength < compactDocument.byteLength;
  const body = useCompression ? compressedDocument : compactDocument;
  const payloadBytes = new Uint8Array(FORMAT_HEADER_BYTES + body.byteLength);

  payloadBytes[0] = useCompression ? ZLIB_MODE : RAW_MODE;
  writeUint24(payloadBytes, 1, compactDocument.byteLength);
  payloadBytes.set(body, FORMAT_HEADER_BYTES);

  return `${PAYLOAD_PREFIX}${encodeBase64Url(payloadBytes)}`;
}

export function decodeDocumentPayload(value: string): SharedDocument {
  const payload = normalizePayload(value);
  const prefix = payload.startsWith(PAYLOAD_PREFIX)
    ? PAYLOAD_PREFIX
    : LEGACY_PAYLOAD_PREFIX;
  const encodedEnvelope = payload.slice(prefix.length);

  const maximumEncodedLength =
    prefix === PAYLOAD_PREFIX
      ? MAXIMUM_COMPACT_PAYLOAD_CHARACTERS
      : MAXIMUM_LEGACY_PAYLOAD_CHARACTERS;
  if (
    encodedEnvelope.length === 0 ||
    encodedEnvelope.length > maximumEncodedLength
  ) {
    throw new LinkFormatError(
      "INVALID_PAYLOAD",
      "The encoded document exceeds the supported payload size.",
    );
  }

  if (!BASE64URL_PATTERN.test(encodedEnvelope)) {
    throw new LinkFormatError(
      "INVALID_PAYLOAD",
      "The Base64URL payload is invalid.",
    );
  }

  try {
    const bytes = decodeBase64Url(encodedEnvelope);
    return prefix === PAYLOAD_PREFIX
      ? decodeCompactPayload(bytes)
      : decodeLegacyPayload(bytes);
  } catch (error) {
    if (error instanceof LinkFormatError) {
      throw error;
    }

    throw new LinkFormatError(
      "INVALID_PAYLOAD",
      "Could not decode the document from the URL.",
      { cause: error },
    );
  }
}

function encodeCompactDocument(document: SharedDocument): Uint8Array {
  const nameBytes = textEncoder.encode(document.name);
  const contentBytes = textEncoder.encode(document.content);
  const bytes = new Uint8Array(
    DOCUMENT_NAME_LENGTH_BYTES + nameBytes.byteLength + contentBytes.byteLength,
  );

  bytes[0] = nameBytes.byteLength >>> 8;
  bytes[1] = nameBytes.byteLength & 0xff;
  bytes.set(nameBytes, DOCUMENT_NAME_LENGTH_BYTES);
  bytes.set(contentBytes, DOCUMENT_NAME_LENGTH_BYTES + nameBytes.byteLength);
  return bytes;
}

function decodeCompactPayload(payloadBytes: Uint8Array): SharedDocument {
  if (payloadBytes.byteLength <= FORMAT_HEADER_BYTES) {
    throw new LinkFormatError("INVALID_PAYLOAD", "The payload is incomplete.");
  }

  const mode = payloadBytes[0];
  const expectedLength = readUint24(payloadBytes, 1);
  if (
    expectedLength < DOCUMENT_NAME_LENGTH_BYTES ||
    expectedLength > MAXIMUM_COMPACT_DOCUMENT_BYTES
  ) {
    throw new LinkFormatError(
      "INVALID_PAYLOAD",
      "The decoded document size is invalid.",
    );
  }

  const body = payloadBytes.subarray(FORMAT_HEADER_BYTES);
  let documentBytes: Uint8Array;
  if (mode === RAW_MODE) {
    documentBytes = body;
  } else if (mode === ZLIB_MODE) {
    documentBytes = unzlibSync(body, {
      out: new Uint8Array(expectedLength + 1),
    });
  } else {
    throw new LinkFormatError(
      "INVALID_PAYLOAD",
      "The payload compression mode is not supported.",
    );
  }

  if (documentBytes.byteLength !== expectedLength) {
    throw new LinkFormatError(
      "INVALID_PAYLOAD",
      "The decoded document length does not match the payload header.",
    );
  }

  const nameLength = ((documentBytes[0] ?? 0) << 8) | (documentBytes[1] ?? 0);
  if (
    nameLength === 0 ||
    DOCUMENT_NAME_LENGTH_BYTES + nameLength > documentBytes.byteLength
  ) {
    throw new LinkFormatError(
      "INVALID_PAYLOAD",
      "The encoded document name is invalid.",
    );
  }

  const contentOffset = DOCUMENT_NAME_LENGTH_BYTES + nameLength;
  return parseSharedDocument({
    name: textDecoder.decode(
      documentBytes.subarray(DOCUMENT_NAME_LENGTH_BYTES, contentOffset),
    ),
    mediaType: "text/markdown",
    content: textDecoder.decode(documentBytes.subarray(contentOffset)),
  });
}

function decodeLegacyPayload(bytes: Uint8Array): SharedDocument {
  const json = textDecoder.decode(bytes);
  return parseLegacyEncodedEnvelope(JSON.parse(json) as unknown);
}

function normalizePayload(value: string): string {
  const withoutHash = value.startsWith("#") ? value.slice(1) : value;
  const payload = withoutHash.startsWith("/")
    ? withoutHash.slice(1)
    : withoutHash;

  if (
    !payload.startsWith(PAYLOAD_PREFIX) &&
    !payload.startsWith(LEGACY_PAYLOAD_PREFIX)
  ) {
    throw new LinkFormatError(
      "UNSUPPORTED_VERSION",
      `The link must start with ${PAYLOAD_PREFIX}`,
    );
  }

  return payload;
}

function writeUint24(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value >>> 16;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = value & 0xff;
}

function readUint24(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 16) |
    ((bytes[offset + 1] ?? 0) << 8) |
    (bytes[offset + 2] ?? 0)
  );
}

function getBase64UrlLength(byteLength: number): number {
  return Math.ceil((byteLength * 4) / 3);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += BINARY_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + BINARY_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const paddingLength = (4 - (value.length % 4)) % 4;
  const base64 =
    value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(paddingLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
