export const THEME_STORAGE_KEY = "skillslink:theme";

export const THEMES = ["dark", "light"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: string | null): value is Theme {
  return value !== null && THEMES.some((theme) => theme === value);
}

export function resolveTheme(value: string | null): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function getNextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function readStoredTheme(): Theme {
  try {
    return resolveTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function persistTheme(theme: Theme): void {
  applyTheme(theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still applies to the current page when storage is unavailable.
  }
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var themes=${JSON.stringify(THEMES)},value=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.dataset.theme=themes.indexOf(value)>-1?value:${JSON.stringify(DEFAULT_THEME)}}catch(error){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)}}})()`;
