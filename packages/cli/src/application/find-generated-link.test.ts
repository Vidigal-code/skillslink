import { describe, expect, it } from "vitest";

import type { GeneratedLink, LinkRegistry } from "../domain/registry";
import { findGeneratedLink } from "./find-generated-link";

const newestLink = createLink({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Guide.md",
  createdAt: "2026-09-06T13:00:00.000Z",
});
const olderLink = createLink({
  id: "00000000-0000-4000-8000-000000000002",
  name: "guide.md",
  createdAt: "2026-09-06T12:00:00.000Z",
});
const registry: LinkRegistry = {
  schemaVersion: 2,
  settings: {
    siteUrl: "https://example.com/",
    listDisplayMode: "divided",
  },
  links: [newestLink, olderLink],
};

describe("findGeneratedLink", () => {
  it("finds an exact ID or URL", () => {
    expect(findGeneratedLink(olderLink.id, registry)).toBe(olderLink);
    expect(findGeneratedLink(newestLink.url, registry)).toBe(newestLink);
  });

  it("finds a file name without case sensitivity and prefers the newest entry", () => {
    expect(findGeneratedLink("GUIDE.MD", registry)).toBe(newestLink);
  });
});

function createLink(
  values: Pick<GeneratedLink, "id" | "name" | "createdAt">,
): GeneratedLink {
  return {
    ...values,
    mediaType: "text/markdown",
    url: `https://example.com/view/#document=${values.id}`,
    parts: [],
  };
}
