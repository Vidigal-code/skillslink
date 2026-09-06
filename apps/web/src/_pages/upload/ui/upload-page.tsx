import { AlertTriangle, FileWarning, Lightbulb, Split } from "lucide-react";
import { styled } from "next-yak";

import { GenerateDocumentLinkForm } from "@/features/generate-document-link";
import { includeDocumentSizeLimit } from "@/shared/config/document";
import { breakpoints } from "@/shared/config/theme.yak";
import { getLanguageDictionary, type LanguageCode } from "@/shared/i18n";
import {
  ContentPanel,
  PageContainer,
  PageEyebrow,
  PageFooter,
  PageLead,
  PageMain,
  PageTitle,
} from "@/shared/ui";
import { SiteHeader } from "@/widgets/site-header";

const Warning = styled.aside`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-sm);
  margin-top: var(--space-xl);
  padding: var(--space-md);
  border: 0.0625rem solid var(--color-warning);
  border-radius: var(--radius-sm);
  background: var(--color-warning-soft);
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  line-height: 1.65;

  svg {
    color: var(--color-warning);
  }

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
`;

const LimitNotice = styled.aside`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-sm);
  margin-top: var(--space-xl);
  padding: var(--space-md);
  border: 0.0625rem solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
  color: var(--color-ink-muted);

  h2 {
    margin: 0 0 var(--space-xxs);
    color: var(--color-ink);
    font-size: 0.9375rem;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.65;
  }

  svg {
    color: var(--color-accent);
  }

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
`;

const LinkGuide = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-md);

  article {
    padding: var(--space-lg);
    border: 0.0625rem solid var(--color-hairline);
    border-radius: var(--radius-md);
    background: var(--color-surface-1);
    box-shadow: var(--shadow-raised);
  }

  h2 {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
    margin: 0 0 var(--space-sm);
    color: var(--color-ink);
    font-size: 1rem;
  }

  p,
  li {
    color: var(--color-ink-muted);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  p,
  ol {
    margin: 0;
  }

  ol {
    display: grid;
    gap: var(--space-xs);
    padding-left: 1.25rem;
  }

  svg {
    color: var(--color-accent);
  }

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;

    h2 {
      justify-content: center;
    }

    article {
      text-align: center;
    }

    ol {
      text-align: left;
    }
  }
`;

export interface UploadPageProps {
  readonly language: LanguageCode;
  readonly viewerSiteUrl: string;
  readonly localized?: boolean;
}

export function UploadPage({
  language,
  viewerSiteUrl,
  localized = true,
}: UploadPageProps) {
  const dictionary = getLanguageDictionary(language);

  return (
    <>
      <SiteHeader language={language} route="upload" localized={localized} />
      <PageMain>
        <PageContainer>
          <PageEyebrow>{dictionary.upload.eyebrow}</PageEyebrow>
          <PageTitle>{dictionary.upload.title}</PageTitle>
          <PageLead>{dictionary.upload.lead}</PageLead>
          <ContentPanel>
            <GenerateDocumentLinkForm
              language={language}
              viewerSiteUrl={viewerSiteUrl}
            />
          </ContentPanel>
          <LimitNotice>
            <FileWarning aria-hidden="true" size={19} />
            <div>
              <h2>{includeDocumentSizeLimit(dictionary.upload.limitTitle)}</h2>
              <p>{includeDocumentSizeLimit(dictionary.upload.limitText)}</p>
            </div>
          </LimitNotice>
          <LinkGuide>
            <article>
              <h2>
                <Split aria-hidden="true" size={18} />
                {dictionary.upload.splittingTitle}
              </h2>
              <p>{includeDocumentSizeLimit(dictionary.upload.splittingText)}</p>
            </article>
            <article>
              <h2>
                <Lightbulb aria-hidden="true" size={18} />
                {dictionary.upload.skillTipsTitle}
              </h2>
              <ol>
                {dictionary.upload.skillTips.map((tip) => (
                  <li key={tip}>{includeDocumentSizeLimit(tip)}</li>
                ))}
              </ol>
            </article>
          </LinkGuide>
          <Warning>
            <AlertTriangle aria-hidden="true" size={19} />
            <span>{dictionary.upload.portableWarning}</span>
          </Warning>
        </PageContainer>
      </PageMain>
      <PageFooter>
        <PageContainer>{dictionary.footer}</PageContainer>
      </PageFooter>
    </>
  );
}
