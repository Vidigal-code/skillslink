import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_THEME,
  getNextTheme,
  isTheme,
  persistTheme,
  readStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "./theme";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("theme preferences", () => {
  it("accepts only supported theme values", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("falls back to the dark theme for missing or invalid preferences", () => {
    expect(resolveTheme(null)).toBe(DEFAULT_THEME);
    expect(resolveTheme("unsupported")).toBe(DEFAULT_THEME);
  });

  it("alternates between the light and dark themes", () => {
    expect(getNextTheme("dark")).toBe("light");
    expect(getNextTheme("light")).toBe("dark");
  });

  it("reads a valid browser preference", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn().mockReturnValue("light"),
      },
    });

    expect(readStoredTheme()).toBe("light");
  });

  it("applies and stores a theme selection", () => {
    const setItem = vi.fn();
    const dataset: Record<string, string> = {};
    vi.stubGlobal("window", { localStorage: { setItem } });
    vi.stubGlobal("document", { documentElement: { dataset } });

    persistTheme("light");

    expect(dataset.theme).toBe("light");
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");
  });
});
