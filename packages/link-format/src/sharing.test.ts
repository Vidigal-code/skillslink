import { describe, expect, it } from "vitest";

import { MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS } from "./model";
import {
  abbreviatePortableUrl,
  createAiLearningPrompt,
  selectAiPromptUrls,
} from "./sharing";

describe("AI learning prompt links", () => {
  it("uses every divided link even when the complete link is short", () => {
    const links = {
      fullUrl: "https://example.com/full",
      partUrls: ["https://example.com/one", "https://example.com/two"],
    };

    expect(selectAiPromptUrls(links)).toEqual(links.partUrls);
    expect(createAiLearningPrompt(links)).toContain(
      "Learn this skill by opening every SkillsLink page URL below in order:",
    );
  });

  it("keeps using only part links when the complete link exceeds the limit", () => {
    const links = {
      fullUrl: `https://example.com/${"a".repeat(
        MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS,
      )}`,
      partUrls: ["https://example.com/one", "https://example.com/two"],
    };

    expect(selectAiPromptUrls(links)).toEqual(links.partUrls);
    expect(createAiLearningPrompt(links)).not.toContain(links.fullUrl);
  });

  it("supports complete and all prompt modes while the full link is safe", () => {
    const links = {
      fullUrl: "https://example.com/full",
      partUrls: ["https://example.com/one"],
    };

    expect(selectAiPromptUrls(links, "complete")).toEqual([links.fullUrl]);
    expect(selectAiPromptUrls(links, "all")).toEqual([
      links.fullUrl,
      ...links.partUrls,
    ]);
  });

  it("abbreviates displayed URLs with three dots", () => {
    expect(abbreviatePortableUrl("https://example.com/very-long", 20)).toBe(
      "https://example.c...",
    );
  });
});
