"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import { styled } from "next-yak";

import { breakpoints } from "@/shared/config/theme.yak";
import {
  getLanguageDictionary,
  LANGUAGE_CODES,
  type LanguageCode,
} from "@/shared/i18n";
import { createLocalizedPath, type SiteRoute } from "@/shared/routing";

const Selector = styled.details`
  position: relative;
  min-width: 9rem;

  &[open] > summary {
    border-color: var(--color-ink-subtle);
    background: var(--color-surface-2);
  }

  &[open] > summary > svg:last-child {
    transform: rotate(180deg);
  }

  @media (max-width: ${breakpoints.tablet}) {
    width: 100%;
    min-width: 0;
  }
`;

const Trigger = styled.summary`
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  width: 100%;
  min-height: 2.75rem;
  padding: 0 var(--space-sm);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  color: var(--color-ink-muted);
  cursor: pointer;
  list-style: none;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease;

  &::-webkit-details-marker {
    display: none;
  }

  &:hover {
    border-color: var(--color-ink-subtle);
    background: var(--color-surface-2);
    color: var(--color-ink);
  }
`;

const CurrentLabel = styled.span`
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: currentColor;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Chevron = styled(ChevronDown)`
  flex: none;
  transition: transform 140ms ease;
`;

const Menu = styled.ul`
  position: absolute;
  z-index: 30;
  top: calc(100% + var(--space-xs));
  right: 0;
  display: grid;
  width: 12rem;
  gap: var(--space-xxs);
  margin: 0;
  padding: var(--space-xs);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-floating);
  list-style: none;

  @media (max-width: ${breakpoints.tablet}) {
    right: auto;
    left: 0;
    width: 100%;
  }
`;

const LanguageLink = styled(Link)`
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  gap: var(--space-xs);
  align-items: center;
  min-height: 2.5rem;
  padding: 0 var(--space-xs);
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  text-decoration: none;
  transition:
    background-color 120ms ease,
    color 120ms ease;

  &:hover,
  &:focus-visible,
  &[aria-current="page"] {
    background: var(--color-surface-2);
    color: var(--color-ink);
  }

  &[aria-current="page"] svg {
    color: var(--color-accent);
  }
`;

const LanguageCode = styled.span`
  color: var(--color-ink-subtle);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
`;

const LanguageName = styled.span`
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 500;
`;

export interface LanguageSelectorProps {
  readonly language: LanguageCode;
  readonly route: SiteRoute;
}

export function LanguageSelector({ language, route }: LanguageSelectorProps) {
  const router = useRouter();
  const dictionary = getLanguageDictionary(language);
  const selectorRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeFromOutside(event: PointerEvent): void {
      if (!selectorRef.current?.contains(event.target as Node)) {
        selectorRef.current?.removeAttribute("open");
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, [open]);

  function selectLanguage(
    event: MouseEvent<HTMLAnchorElement>,
    nextLanguage: LanguageCode,
  ): void {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    selectorRef.current?.removeAttribute("open");
    setOpen(false);
    const nextPath = createLocalizedPath(nextLanguage, route);
    router.push(`${nextPath}${window.location.search}${window.location.hash}`);
  }

  function closeWithKeyboard(event: KeyboardEvent<HTMLDetailsElement>): void {
    if (event.key !== "Escape" || !selectorRef.current?.open) {
      return;
    }

    event.preventDefault();
    selectorRef.current.removeAttribute("open");
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <Selector
      ref={selectorRef}
      onKeyDown={closeWithKeyboard}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <Trigger
        ref={triggerRef}
        aria-label={`${dictionary.menu.language}: ${dictionary.menu[language]}`}
      >
        <Languages aria-hidden="true" size={16} strokeWidth={1.8} />
        <CurrentLabel>{dictionary.menu[language]}</CurrentLabel>
        <Chevron aria-hidden="true" size={15} strokeWidth={1.8} />
      </Trigger>
      <Menu aria-label={dictionary.menu.language}>
        {LANGUAGE_CODES.map((code) => (
          <li key={code}>
            <LanguageLink
              href={createLocalizedPath(code, route)}
              aria-current={code === language ? "page" : undefined}
              hrefLang={code}
              onClick={(event) => selectLanguage(event, code)}
            >
              <LanguageCode>{code}</LanguageCode>
              <LanguageName>{dictionary.menu[code]}</LanguageName>
              {code === language ? (
                <Check aria-hidden="true" size={15} />
              ) : null}
            </LanguageLink>
          </li>
        ))}
      </Menu>
    </Selector>
  );
}
