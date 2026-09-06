import { describe, expect, it } from "vitest";

import type { LinkRegistry } from "../domain/registry";
import {
  createRegisteredLinkTargets,
  findRegisteredLinkTarget,
} from "./find-registered-link-target";

const registry: LinkRegistry = {
  schemaVersion: 2,
  settings: {
    siteUrl: "https://example.com/",
    listDisplayMode: "divided",
  },
  links: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "skill.md",
      mediaType: "text/markdown",
      url: "https://example.com/view/#document=v1.full",
      createdAt: "2026-09-06T12:00:00.000Z",
      parts: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          title: "Workflow",
          headingLevel: 2,
          name: "skill--part-01.md",
          byteLength: 42,
          url: "https://example.com/view/#document=v1.section",
        },
      ],
    },
  ],
};

describe("registered link targets", () => {
  it("flattens the parent and its nested part links", () => {
    expect(
      createRegisteredLinkTargets(registry).map((target) => target.kind),
    ).toEqual(["document", "part"]);
  });

  it("finds a part by UUID, generated name, or title", () => {
    const partId = registry.links[0]?.parts[0]?.id ?? "";

    expect(findRegisteredLinkTarget(partId, registry)?.kind).toBe("part");
    expect(findRegisteredLinkTarget("SKILL--PART-01.MD", registry)?.title).toBe(
      "Workflow",
    );
    expect(findRegisteredLinkTarget("workflow", registry)?.id).toBe(partId);
  });
});
