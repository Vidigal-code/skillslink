import { describe, expect, it } from "vitest";

import {
  createRawDocumentUrl,
  createViewerUrl,
  extractDocumentPayloadFromUrl,
  normalizeSiteUrl,
} from "./urls";

describe("document URLs", () => {
  const documentId = "0123456789abcdef";

  it("keeps a project base path and stores the payload in the browser fragment", () => {
    expect(
      createViewerUrl({
        siteUrl: "https://example.github.io/skillslink",
        payload: "v1.abc_def",
      }),
    ).toBe("https://example.github.io/skillslink/view/#document=v1.abc_def");
  });

  it("keeps even a long payload outside the HTTP request URL", () => {
    const viewerUrl = createViewerUrl({
      siteUrl: "https://example.github.io/skillslink/",
      payload: `v1.${"a".repeat(20_000)}`,
    });
    const parsedUrl = new URL(viewerUrl);

    expect(parsedUrl.search).toBe("");
    expect(viewerUrl.slice(0, viewerUrl.indexOf("#"))).toBe(
      "https://example.github.io/skillslink/view/",
    );
  });

  it("extracts current fragment links and legacy query or direct-fragment links", () => {
    expect(
      extractDocumentPayloadFromUrl(
        "https://example.com/view/#document=v1.current",
      ),
    ).toBe("v1.current");
    expect(
      extractDocumentPayloadFromUrl(
        "https://example.com/view/?document=v1.legacy",
      ),
    ).toBe("v1.legacy");
    expect(
      extractDocumentPayloadFromUrl("https://example.com/view/#v1.direct"),
    ).toBe("v1.direct");
  });

  it("creates a raw extension from the media type", () => {
    expect(
      createRawDocumentUrl({
        siteUrl: "https://example.github.io/skillslink/",
        documentId,
        mediaType: "text/markdown",
      }),
    ).toBe("https://example.github.io/skillslink/raw/0123456789abcdef.md");
  });

  it("normalizes the configured site URL", () => {
    expect(
      normalizeSiteUrl("https://example.com/docs?ignored=true#fragment"),
    ).toBe("https://example.com/docs/");
  });
});
