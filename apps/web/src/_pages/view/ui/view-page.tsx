"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { styled } from "next-yak";

import {
  decodeDocumentPayload,
  extractDocumentPayloadFromUrl,
  type SharedDocument,
} from "@skillslink/link-format";
import { breakpoints } from "@/shared/config/theme.yak";
import { getLanguageDictionary, type LanguageCode } from "@/shared/i18n";
import { createDefaultPath, createLocalizedPath } from "@/shared/routing";
import { PageContainer, PageFooter, PageMain } from "@/shared/ui";
import { DocumentWorkspace } from "@/widgets/document-workspace";
import { SiteHeader } from "@/widgets/site-header";

type RecoveryState =
  | { readonly status: "loading" }
  | { readonly status: "invalid" }
  | { readonly status: "recovered"; readonly document: SharedDocument };

const StatusPanel = styled.section`
  max-width: 42rem;
  padding: clamp(1.5rem, 5vw, 2.5rem);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
    text-align: center;
  }
`;

const IconBox = styled.div`
  display: grid;
  width: 3rem;
  height: 3rem;
  margin-bottom: var(--space-lg);
  place-items: center;
  border: 0.0625rem solid var(--color-error);
  border-radius: var(--radius-sm);
  background: var(--color-error-soft);
  color: var(--color-error);

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

const StatusTitle = styled.h1`
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.05em;
`;

const StatusText = styled.p`
  margin: var(--space-lg) 0;
  color: var(--color-ink-muted);
  line-height: 1.5;
`;

const HomeLink = styled(Link)`
  display: inline-flex;
  gap: var(--space-xs);
  align-items: center;
  min-height: 2.75rem;
  padding: 0 var(--space-md);
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    opacity: 0.88;
  }
`;

export interface ViewPageProps {
  readonly language: LanguageCode;
  readonly viewerSiteUrl: string;
  readonly localized?: boolean;
}

export function ViewPage({
  language,
  viewerSiteUrl,
  localized = true,
}: ViewPageProps) {
  const dictionary = getLanguageDictionary(language);
  const payload = useSyncExternalStore(
    subscribeToLocationChanges,
    readDocumentPayload,
    readServerPayload,
  );
  const state = useMemo(() => recoverDocument(payload), [payload]);
  const homePath = localized
    ? createLocalizedPath(language, "")
    : createDefaultPath("");

  return (
    <>
      <SiteHeader language={language} route="view" localized={localized} />
      <PageMain>
        <PageContainer>
          {state.status === "recovered" ? (
            <DocumentWorkspace
              initialDocument={state.document}
              viewerSiteUrl={viewerSiteUrl}
              language={language}
              label={dictionary.document.recoveredLabel}
            />
          ) : (
            <StatusPanel aria-live="polite">
              <IconBox>
                <AlertCircle aria-hidden="true" />
              </IconBox>
              <StatusTitle>
                {state.status === "loading"
                  ? dictionary.document.loadingTitle
                  : dictionary.document.missingTitle}
              </StatusTitle>
              <StatusText>
                {state.status === "loading"
                  ? dictionary.document.loadingText
                  : dictionary.document.missingText}
              </StatusText>
              <HomeLink href={homePath}>
                <RotateCcw aria-hidden="true" size={16} />
                {dictionary.document.backHome}
              </HomeLink>
            </StatusPanel>
          )}
        </PageContainer>
      </PageMain>
      <PageFooter>
        <PageContainer>{dictionary.footer}</PageContainer>
      </PageFooter>
    </>
  );
}

function subscribeToLocationChanges(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("hashchange", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("hashchange", onStoreChange);
  };
}

function readDocumentPayload(): string | null {
  return extractDocumentPayloadFromUrl(window.location.href) ?? "";
}

function readServerPayload(): null {
  return null;
}

function recoverDocument(payload: string | null): RecoveryState {
  if (payload === null) {
    return { status: "loading" };
  }

  try {
    return {
      status: "recovered",
      document: decodeDocumentPayload(payload),
    };
  } catch {
    return { status: "invalid" };
  }
}
