import { CalendarDays, Hash } from "lucide-react";
import { styled } from "next-yak";

import type { DocumentSnapshot } from "@skillslink/link-format";
import { breakpoints, layout } from "@/shared/config/theme.yak";
import {
  getIntlLocale,
  getLanguageDictionary,
  type LanguageCode,
} from "@/shared/i18n";
import { DocumentWorkspace } from "@/widgets/document-workspace";
import { SiteHeader } from "@/widgets/site-header";

const Main = styled.main`
  width: min(calc(100% - 3rem), ${layout.contentWidth});
  margin: 0 auto;
  padding: clamp(3.5rem, 8vw, 6.5rem) 0 var(--space-section);

  @media (max-width: ${breakpoints.mobile}) {
    width: min(calc(100% - 2rem), ${layout.contentWidth});
  }

  @media (max-width: ${breakpoints.compact}) {
    width: min(calc(100% - 1.5rem), ${layout.contentWidth});
  }
`;

const SnapshotMeta = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm) var(--space-lg);
  margin: 0 0 var(--space-lg);
  color: var(--color-ink-subtle);
  font-size: 0.8125rem;

  span {
    display: inline-flex;
    gap: var(--space-xs);
    align-items: center;
  }

  @media (max-width: ${breakpoints.tablet}) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const MachineNote = styled.aside`
  max-width: ${layout.readingWidth};
  margin: var(--space-xl) auto 0;
  padding: var(--space-md) var(--space-lg);
  border: 0.0625rem solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  line-height: 1.5;

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;

export interface DocumentPageProps {
  readonly snapshot: DocumentSnapshot;
  readonly rawUrl: string;
  readonly viewerSiteUrl: string;
  readonly language: LanguageCode;
  readonly localized?: boolean;
}

export function DocumentPage({
  snapshot,
  rawUrl,
  viewerSiteUrl,
  language,
  localized = true,
}: DocumentPageProps) {
  const dictionary = getLanguageDictionary(language);
  const dateFormatter = new Intl.DateTimeFormat(getIntlLocale(language), {
    dateStyle: "long",
    timeZone: "UTC",
  });

  return (
    <>
      <SiteHeader
        language={language}
        route={`d/${snapshot.id}`}
        localized={localized}
      />
      <Main>
        <SnapshotMeta>
          <span>
            <CalendarDays aria-hidden="true" size={15} />
            {dictionary.document.publishedOn}{" "}
            {dateFormatter.format(new Date(snapshot.publishedAt))}
          </span>
          <span>
            <Hash aria-hidden="true" size={15} />
            {dictionary.document.identifier} {snapshot.id}
          </span>
        </SnapshotMeta>
        <DocumentWorkspace
          initialDocument={snapshot.document}
          viewerSiteUrl={viewerSiteUrl}
          language={language}
          rawUrl={rawUrl}
          label={dictionary.document.repositoryLabel}
        />
        <MachineNote>{dictionary.document.machineNote}</MachineNote>
      </Main>
    </>
  );
}
