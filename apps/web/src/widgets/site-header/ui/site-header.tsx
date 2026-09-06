import Link from "next/link";
import { Code2 } from "lucide-react";
import { styled } from "next-yak";

import { LanguageSelector } from "@/features/select-language";
import { ThemeToggle } from "@/features/select-theme";
import { SOURCE_REPOSITORY_URL } from "@/shared/config/site";
import { breakpoints, layout } from "@/shared/config/theme.yak";
import { getLanguageDictionary, type LanguageCode } from "@/shared/i18n";
import { SiteLogo } from "@/shared/ui";
import {
  createDefaultPath,
  createLocalizedPath,
  type SiteRoute,
} from "@/shared/routing";

const Header = styled.header`
  position: relative;
  z-index: 20;
  border-bottom: 0.0625rem solid var(--color-hairline-soft);
  background: var(--color-canvas);
`;

const HeaderInner = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--space-lg);
  align-items: center;
  width: min(calc(100% - 3rem), ${layout.contentWidth});
  min-height: ${layout.headerHeight};
  margin: 0 auto;

  @media (max-width: ${breakpoints.laptop}) {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
    justify-items: center;
    padding: var(--space-md) 0;
  }

  @media (max-width: ${breakpoints.tablet}) {
    width: min(calc(100% - 2rem), ${layout.contentWidth});
  }

  @media (max-width: ${breakpoints.compact}) {
    width: min(calc(100% - 1.5rem), ${layout.contentWidth});
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  gap: var(--space-xs);
  align-items: center;
  width: fit-content;
  min-height: 2.75rem;
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  text-decoration: none;
`;

const Mark = styled.span`
  display: block;
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
`;

const Navigation = styled.nav`
  display: flex;
  gap: var(--space-xxs);
  align-items: center;
  justify-content: center;
  padding: 0.1875rem;
  border: 0.0625rem solid var(--color-hairline-soft);
  border-radius: var(--radius-pill);
  background: var(--color-surface-1);

  @media (max-width: ${breakpoints.tablet}) {
    display: grid;
    width: 100%;
  }
`;

const NavigationLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.375rem;
  padding: 0 var(--space-sm);
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color 140ms ease,
    color 140ms ease;

  &:hover {
    background: var(--color-surface-2);
    color: var(--color-ink);
  }

  @media (max-width: ${breakpoints.tablet}) {
    width: 100%;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  justify-content: flex-end;
  min-width: 0;

  @media (max-width: ${breakpoints.laptop}) {
    justify-content: center;
  }

  @media (max-width: ${breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
    width: 100%;

    button {
      width: 100%;
    }
  }
`;

const RepositoryLink = styled.a`
  display: inline-flex;
  gap: var(--space-xs);
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0 var(--space-sm);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease;

  &:hover {
    border-color: var(--color-ink-subtle);
    background: var(--color-surface-2);
    color: var(--color-ink);
  }

  @media (max-width: ${breakpoints.tablet}) {
    width: 100%;
  }
`;

export interface SiteHeaderProps {
  readonly language: LanguageCode;
  readonly route: SiteRoute;
  readonly localized?: boolean;
}

export function SiteHeader({
  language,
  route,
  localized = true,
}: SiteHeaderProps) {
  const dictionary = getLanguageDictionary(language);
  const createPath = (nextRoute: SiteRoute): string =>
    localized
      ? createLocalizedPath(language, nextRoute)
      : createDefaultPath(nextRoute);

  return (
    <Header>
      <HeaderInner>
        <Brand
          href={createPath("")}
          aria-label={`SkillsLink — ${dictionary.menu.home}`}
        >
          <Mark aria-hidden="true">
            <SiteLogo decorative preload />
          </Mark>
          SkillsLink
        </Brand>
        <Navigation aria-label={dictionary.menu.navigation}>
          <NavigationLink href={createPath("")}>
            {dictionary.menu.home}
          </NavigationLink>
          <NavigationLink href={createPath("about")}>
            {dictionary.menu.about}
          </NavigationLink>
          <NavigationLink href={createPath("upload")}>
            {dictionary.menu.upload}
          </NavigationLink>
        </Navigation>
        <Actions>
          <LanguageSelector language={language} route={route} />
          <ThemeToggle language={language} />
          <RepositoryLink
            href={SOURCE_REPOSITORY_URL}
            rel="noreferrer"
            target="_blank"
          >
            <Code2 aria-hidden="true" size={16} />
            <span>{dictionary.menu.github}</span>
          </RepositoryLink>
        </Actions>
      </HeaderInner>
    </Header>
  );
}
