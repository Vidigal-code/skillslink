import { describe, expect, it } from "vitest";

import { resolveRuntimeUrl } from "./runtime-url";

const OFFICIAL_VIEWER_URL =
  "https://vidigal-code.github.io/skillslink/pt/view/#document=payload";

describe("runtime site URLs", () => {
  it("keeps the official URL outside a local browser", () => {
    expect(
      resolveRuntimeUrl({
        configuredUrl: OFFICIAL_VIEWER_URL,
        location: {
          hostname: "vidigal-code.github.io",
          origin: "https://vidigal-code.github.io",
        },
      }),
    ).toBe(OFFICIAL_VIEWER_URL);
  });

  it("uses the active localhost origin and port", () => {
    expect(
      resolveRuntimeUrl({
        configuredUrl: OFFICIAL_VIEWER_URL,
        location: {
          hostname: "localhost",
          origin: "http://localhost:3210",
        },
        publicBasePath: "",
      }),
    ).toBe("http://localhost:3210/pt/view/#document=payload");
  });

  it("preserves a configured base path on a loopback address", () => {
    expect(
      resolveRuntimeUrl({
        configuredUrl:
          "https://vidigal-code.github.io/skillslink/raw/example.md",
        location: {
          hostname: "127.0.0.1",
          origin: "http://127.0.0.1:3000",
        },
        publicBasePath: "/skillslink/",
      }),
    ).toBe("http://127.0.0.1:3000/skillslink/raw/example.md");
  });
});
