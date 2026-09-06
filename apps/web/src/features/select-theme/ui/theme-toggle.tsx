"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { styled } from "next-yak";

import { getLanguageDictionary, type LanguageCode } from "@/shared/i18n";

import {
  applyTheme,
  getNextTheme,
  persistTheme,
  readStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "../model/theme";

const Toggle = styled.button`
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  color: var(--color-ink-muted);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;

  &:hover {
    border-color: var(--color-ink-subtle);
    background: var(--color-surface-2);
    color: var(--color-ink);
  }

  &:active {
    background: var(--color-surface-3);
  }
`;

const Icon = styled.span`
  display: grid;
  width: 1.125rem;
  height: 1.125rem;
  place-items: center;

  & > svg {
    grid-area: 1 / 1;
    transition:
      opacity 160ms ease,
      transform 160ms ease;
  }

  & > svg:first-child {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }

  & > svg:last-child {
    opacity: 0;
    transform: rotate(-35deg) scale(0.7);
  }

  html[data-theme="light"] & > svg:first-child {
    opacity: 0;
    transform: rotate(35deg) scale(0.7);
  }

  html[data-theme="light"] & > svg:last-child {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
`;

export interface ThemeToggleProps {
  readonly language: LanguageCode;
}

export function ThemeToggle({ language }: ThemeToggleProps) {
  const { theme } = getLanguageDictionary(language);

  useLayoutEffect(() => {
    applyTheme(readStoredTheme());

    function synchronizeTheme(event: StorageEvent): void {
      if (event.key === THEME_STORAGE_KEY) {
        applyTheme(resolveTheme(event.newValue));
      }
    }

    window.addEventListener("storage", synchronizeTheme);
    return () => window.removeEventListener("storage", synchronizeTheme);
  }, []);

  function toggleTheme(): void {
    const currentTheme = resolveTheme(
      document.documentElement.dataset.theme ?? null,
    );

    persistTheme(getNextTheme(currentTheme));
  }

  return (
    <Toggle
      type="button"
      onClick={toggleTheme}
      aria-label={theme.toggle}
      title={theme.toggle}
    >
      <Icon aria-hidden="true">
        <Sun size={18} strokeWidth={1.8} />
        <Moon size={17} strokeWidth={1.8} />
      </Icon>
    </Toggle>
  );
}
