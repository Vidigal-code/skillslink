import { describe, expect, it } from "vitest";

import type { GeneratedLink } from "../domain/registry";
import { abbreviate, formatGeneratedLink, formatLinkList } from "./output";

const link: GeneratedLink = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "guide.md",
  mediaType: "text/markdown",
  url: `https://example.com/view/#document=${"a".repeat(100)}`,
  createdAt: "2026-09-06T12:34:56.000Z",
  parts: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      title: "Install",
      headingLevel: 1,
      name: "guide--part-01.md",
      byteLength: 120,
      url: `https://example.com/view/#document=${"b".repeat(100)}`,
    },
  ],
};

describe("CLI output", () => {
  it("shows generated metadata, abbreviated links, and the divided prompt", () => {
    const generated = formatGeneratedLink(link);

    expect(generated).toContain("Created: 2026-09-06T12:34:56Z");
    expect(generated).toContain("Complete URL:");
    expect(generated).toContain("PARTS (1)");
    expect(generated).not.toContain(link.url);
    expect(generated).toContain(link.parts[0]?.url);
    expect(
      generated.startsWith("AI PROMPT (DIVIDED LINKS)\nLearn this skill"),
    ).toBe(true);
  });

  it("renders a compact table without printing the complete long URL", () => {
    const table = formatLinkList([link]);

    expect(table).toContain("CREATED (UTC)");
    expect(table).toContain("guide.md");
    expect(table).toContain("PARTS (1)");
    expect(table).toContain("Install");
    expect(table).toContain("...");
    expect(table).not.toContain(link.url);
    expect(table).toContain(link.parts[0]?.url);
  });

  it("normalizes control characters before abbreviating a cell", () => {
    expect(abbreviate("line\nvalue", 20)).toBe("line value");
  });

  it("omits an oversized complete URL from human output", () => {
    const oversizedLink: GeneratedLink = {
      ...link,
      url: `https://example.com/${"x".repeat(8_000)}`,
    };

    expect(formatGeneratedLink(oversizedLink)).toContain(
      "Complete URL: hidden",
    );
    expect(formatGeneratedLink(oversizedLink)).not.toContain(oversizedLink.url);
    expect(formatLinkList([oversizedLink])).toContain("DIVIDED LINKS ONLY");
    expect(formatLinkList([oversizedLink], { mode: "complete" })).toContain(
      "PARTS (1)",
    );
  });

  it("supports complete and all list modes for compatible URLs", () => {
    const completeOutput = formatLinkList([link], { mode: "complete" });
    const allOutput = formatLinkList([link], { mode: "all" });

    expect(completeOutput).not.toContain("PARTS (1)");
    expect(completeOutput).toContain(link.url);
    expect(completeOutput).not.toContain(link.parts[0]?.url);
    expect(allOutput).toContain("PARTS (1)");
    expect(allOutput).toContain(link.url);
    expect(allOutput).toContain(link.parts[0]?.url);
  });
});
