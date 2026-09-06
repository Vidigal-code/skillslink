import { zlibSync } from "fflate";
import { describe, expect, it } from "vitest";

import { decodeDocumentPayload, encodeDocumentPayload } from "./codec";
import { LinkFormatError } from "./errors";

describe("document payload codec", () => {
  it("preserves Unicode Markdown through a Base64URL round trip", () => {
    const document = {
      name: "guide.md",
      mediaType: "text/markdown" as const,
      content: "# Hello 👋\n\nUnicode content with café and 日本語.",
    };

    const payload = encodeDocumentPayload(document);

    expect(payload).toMatch(/^v2\.[A-Za-z0-9_-]+$/u);
    expect(decodeDocumentPayload(`#${payload}`)).toEqual(document);
  });

  it("compresses repetitive Markdown into a much smaller portable payload", () => {
    const content =
      "## Repeated instruction\nFollow this workflow carefully.\n".repeat(500);

    const payload = encodeDocumentPayload({
      name: "workflow.md",
      mediaType: "text/markdown",
      content,
    });

    expect(payload.length).toBeLessThan(content.length / 4);
    expect(decodeDocumentPayload(payload).content).toBe(content);
  });

  it("keeps version 1 Markdown links readable", () => {
    const document = {
      name: "legacy.md",
      mediaType: "text/markdown" as const,
      content: "# Legacy\nStill readable.",
    };

    expect(decodeDocumentPayload(createLegacyPayload(document))).toEqual(
      document,
    );
  });

  it("rejects malformed payloads with a domain error", () => {
    expect(() => decodeDocumentPayload("#v1.invalid*payload")).toThrow(
      LinkFormatError,
    );
  });

  it("rejects oversized encoded input before Base64URL decoding", () => {
    const oversizedEnvelope = "A".repeat(1_000_000);

    expect(() => decodeDocumentPayload(`v2.${oversizedEnvelope}`)).toThrowError(
      expect.objectContaining({ code: "INVALID_PAYLOAD" }),
    );
    expect(() => decodeDocumentPayload(`v1.${oversizedEnvelope}`)).toThrowError(
      expect.objectContaining({ code: "INVALID_PAYLOAD" }),
    );
  });

  it("rejects compressed data whose expanded length disagrees with its header", () => {
    const expandedBytes = new Uint8Array([
      0,
      4,
      ...new TextEncoder().encode("a.md"),
      ...new TextEncoder().encode("A".repeat(32_000)),
    ]);
    const compressedBytes = zlibSync(expandedBytes, { level: 9 });
    const payloadBytes = new Uint8Array(4 + compressedBytes.byteLength);
    payloadBytes[0] = 1;
    payloadBytes[3] = 6;
    payloadBytes.set(compressedBytes, 4);

    expect(() =>
      decodeDocumentPayload(`v2.${encodeBase64Url(payloadBytes)}`),
    ).toThrowError(expect.objectContaining({ code: "INVALID_PAYLOAD" }));
  });

  it("rejects unsupported versions", () => {
    expect(() => decodeDocumentPayload("#v3.abc")).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_VERSION" }),
    );
  });
});

function createLegacyPayload(document: {
  readonly name: string;
  readonly mediaType: "text/markdown";
  readonly content: string;
}): string {
  const json = JSON.stringify({
    v: 1,
    n: document.name,
    m: document.mediaType,
    c: document.content,
  });
  const binary = String.fromCharCode(...new TextEncoder().encode(json));
  return `v1.${btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "")}`;
}

function encodeBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}
