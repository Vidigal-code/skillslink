import { describe, expect, it } from "vitest";

import { createViewerSiteUrl } from "./site";

describe("viewer site URL", () => {
  it("uses the site root for the default language route", () => {
    expect(createViewerSiteUrl()).toBe(
      "https://vidigal-code.github.io/skillslink/",
    );
  });

  it("prefixes a localized route with its language", () => {
    expect(createViewerSiteUrl("pt")).toBe(
      "https://vidigal-code.github.io/skillslink/pt/",
    );
  });
});
