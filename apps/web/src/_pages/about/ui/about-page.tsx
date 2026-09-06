import { Braces, Code2, Database, FileCode2, ShieldCheck } from "lucide-react";
import { styled } from "next-yak";

import { SOURCE_REPOSITORY_URL } from "@/shared/config/site";
import { includeDocumentSizeLimit } from "@/shared/config/document";
import { breakpoints } from "@/shared/config/theme.yak";
import { getLanguageDictionary, type LanguageCode } from "@/shared/i18n";
import {
  PageContainer,
  PageEyebrow,
  PageFooter,
  PageLead,
  PageMain,
  PageTitle,
} from "@/shared/ui";
import { SiteHeader } from "@/widgets/site-header";

const SectionGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-top: var(--space-xxl);

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const SectionCard = styled.article`
  min-height: 15rem;
  padding: var(--space-lg);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;

const IconBox = styled.div`
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 3rem;
  place-items: center;
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-ink);

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

const CardTitle = styled.h2`
  margin: 0 0 var(--space-sm);
  color: var(--color-ink);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
`;

const CardText = styled.p`
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  line-height: 1.5;
`;

const Facts = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  margin-top: var(--space-xxl);

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Fact = styled.article`
  padding: var(--space-lg);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);

  & > svg {
    margin-bottom: var(--space-md);
    color: var(--color-accent);
  }

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;

const Repository = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-xl);
  align-items: center;
  margin-top: var(--space-xxl);
  padding: clamp(1.5rem, 5vw, 2.5rem);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const RepositoryLink = styled.a`
  display: inline-flex;
  gap: var(--space-xs);
  align-items: center;
  justify-content: center;
  min-height: 2.9rem;
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

  @media (max-width: ${breakpoints.mobile}) {
    width: 100%;
  }
`;

const sectionIcons = [Braces, FileCode2, Database] as const;

export interface AboutPageProps {
  readonly language: LanguageCode;
  readonly localized?: boolean;
}

export function AboutPage({ language, localized = true }: AboutPageProps) {
  const dictionary = getLanguageDictionary(language);

  return (
    <>
      <SiteHeader language={language} route="about" localized={localized} />
      <PageMain>
        <PageContainer>
          <PageEyebrow>{dictionary.about.eyebrow}</PageEyebrow>
          <PageTitle>{dictionary.about.title}</PageTitle>
          <PageLead>{dictionary.about.lead}</PageLead>

          <SectionGrid>
            {dictionary.about.sections.map((section, index) => {
              const Icon = sectionIcons[index] ?? Braces;
              return (
                <SectionCard key={section.title}>
                  <IconBox>
                    <Icon aria-hidden="true" size={20} />
                  </IconBox>
                  <CardTitle>{section.title}</CardTitle>
                  <CardText>{section.text}</CardText>
                </SectionCard>
              );
            })}
          </SectionGrid>

          <Facts>
            <Fact>
              <ShieldCheck aria-hidden="true" size={22} />
              <CardTitle>{dictionary.about.guaranteeTitle}</CardTitle>
              <CardText>
                {includeDocumentSizeLimit(dictionary.about.guaranteeText)}
              </CardText>
            </Fact>
            <Fact>
              <FileCode2 aria-hidden="true" size={22} />
              <CardTitle>{dictionary.about.limitationTitle}</CardTitle>
              <CardText>{dictionary.about.limitationText}</CardText>
            </Fact>
          </Facts>

          <Repository>
            <div>
              <CardTitle>{dictionary.about.repositoryTitle}</CardTitle>
              <CardText>{dictionary.about.repositoryText}</CardText>
            </div>
            <RepositoryLink
              href={SOURCE_REPOSITORY_URL}
              rel="noreferrer"
              target="_blank"
            >
              <Code2 aria-hidden="true" size={17} />
              {dictionary.about.repositoryAction}
            </RepositoryLink>
          </Repository>
        </PageContainer>
      </PageMain>
      <PageFooter>
        <PageContainer>{dictionary.footer}</PageContainer>
      </PageFooter>
    </>
  );
}
