import Link from "next/link";
import {
  Bot,
  Braces,
  FileCheck2,
  FileText,
  Globe2,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { styled } from "next-yak";

import { GENERATE_COMMAND, INSTALL_COMMAND } from "@/shared/config/site";
import { includeDocumentSizeLimit } from "@/shared/config/document";
import { breakpoints } from "@/shared/config/theme.yak";
import { getLanguageDictionary, type LanguageCode } from "@/shared/i18n";
import { createDefaultPath, createLocalizedPath } from "@/shared/routing";
import {
  CopyTextButton,
  PageContainer,
  PageFooter,
  SiteLogo,
} from "@/shared/ui";
import { SiteHeader } from "@/widgets/site-header";

const Main = styled.main`
  overflow: hidden;
  background: var(--color-canvas);
`;

const Hero = styled.section`
  position: relative;
  isolation: isolate;
  padding: clamp(5rem, 10vw, 8rem) 0 clamp(4rem, 8vw, 6rem);

  &::before {
    position: absolute;
    z-index: -1;
    inset: -12rem -12rem auto auto;
    width: min(78vw, 62rem);
    height: 42rem;
    background:
      radial-gradient(
        circle at 18% 52%,
        var(--color-brand-cyan-glow),
        transparent 31%
      ),
      radial-gradient(
        circle at 45% 38%,
        var(--color-brand-purple-glow),
        transparent 30%
      ),
      radial-gradient(
        circle at 68% 60%,
        var(--color-brand-violet-glow),
        transparent 28%
      ),
      radial-gradient(
        circle at 88% 42%,
        var(--color-brand-indigo-glow),
        transparent 28%
      );
    filter: blur(3.5rem);
    content: "";
    opacity: 0.7;
    pointer-events: none;
  }

  @media (max-width: ${breakpoints.tablet}) {
    &::before {
      inset: -10rem 50% auto auto;
      width: 56rem;
      transform: translateX(50%);
    }
  }
`;

const HeroLayout = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(20rem, 0.75fr);
  gap: clamp(3rem, 8vw, 7rem);
  align-items: center;

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: var(--space-xxl);
    text-align: center;
  }
`;

const Eyebrow = styled.p`
  margin: 0 0 var(--space-md);
  color: var(--color-ink-subtle);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
  text-transform: uppercase;
`;

const HeroLogoLink = styled(Link)`
  display: block;
  width: 5rem;
  height: 5rem;
  margin-bottom: var(--space-lg);
  border-radius: var(--radius-lg);
  transition:
    filter 160ms ease,
    transform 160ms ease;

  &:hover {
    filter: drop-shadow(0 0.75rem 1.5rem var(--color-brand-purple-glow));
    transform: translateY(-0.125rem);
  }

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

const Title = styled.h1`
  max-width: 12ch;
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(2.75rem, 5vw, 4rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.05em;

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }

  @media (max-width: ${breakpoints.compact}) {
    font-size: 2.25rem;
  }
`;

const Accent = styled.span`
  background: linear-gradient(
    90deg,
    var(--color-brand-text-start),
    var(--color-brand-text-end)
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Lead = styled.p`
  max-width: 43rem;
  margin: var(--space-lg) 0 var(--space-xl);
  color: var(--color-ink-muted);
  font-size: 1rem;
  line-height: 1.5;

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;

  @media (max-width: ${breakpoints.tablet}) {
    flex-direction: column;
    justify-content: center;
  }

  @media (max-width: ${breakpoints.mobile}) {
    & > * {
      width: 100%;
    }
  }
`;

const InstallCode = styled.code`
  color: var(--color-ink-muted);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  overflow-wrap: anywhere;
`;

const TerminalCard = styled.div`
  min-width: 0;
  overflow: hidden;
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-floating);
  text-align: left;
`;

const TerminalChrome = styled.div`
  display: flex;
  gap: 0.4rem;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 0.0625rem solid var(--color-hairline-soft);
  background: var(--color-surface-1);

  span {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-surface-3);
  }
`;

const TerminalBody = styled.div`
  display: grid;
  gap: var(--space-md);
  padding: clamp(1.25rem, 4vw, 2rem);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.5;
`;

const CommandLine = styled.p`
  margin: 0 0 var(--space-sm);
  color: var(--color-ink);
  overflow-wrap: anywhere;

  span {
    color: var(--color-accent);
  }
`;

const ResultLine = styled.p`
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  margin: 0;
  color: var(--color-ink-muted);

  svg {
    color: var(--color-accent);
    flex: 0 0 auto;
  }
`;

const ProofStrip = styled.section`
  border-block: 0.0625rem solid var(--color-hairline-soft);
  background: var(--color-surface-1);
`;

const ProofGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Proof = styled.div`
  padding: 2rem;
  border-right: 0.0625rem solid var(--color-hairline-soft);

  &:last-child {
    border-right: 0;
  }

  @media (max-width: ${breakpoints.tablet}) {
    border-right: 0;
    border-bottom: 0.0625rem solid var(--color-hairline-soft);
    text-align: center;

    &:last-child {
      border-bottom: 0;
    }
  }
`;

const ProofValue = styled.strong`
  display: block;
  margin-bottom: 0.35rem;
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 600;
`;

const ProofText = styled.span`
  color: var(--color-ink-subtle);
  font-size: 0.875rem;
`;

const Section = styled.section`
  padding: var(--space-section) 0;

  & + & {
    border-top: 0.0625rem solid var(--color-hairline-soft);
  }

  @media (max-width: ${breakpoints.mobile}) {
    padding: var(--space-xxl) 0;
  }
`;

const SectionHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(20rem, 0.55fr);
  gap: 3rem;
  align-items: end;
  margin-bottom: var(--space-xxl);

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
    text-align: center;
  }
`;

const SectionTitle = styled.h2`
  max-width: 15ch;
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.04em;

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

const SectionLead = styled.p`
  margin: 0;
  color: var(--color-ink-muted);
  line-height: 1.5;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);

  @media (max-width: ${breakpoints.laptop}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.article`
  min-height: 16rem;
  padding: var(--space-lg);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;

const FeatureIcon = styled.div`
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

const FeatureTitle = styled.h3`
  margin: 0 0 var(--space-sm);
  color: var(--color-ink);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
`;

const FeatureText = styled.p`
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  line-height: 1.5;
`;

const Steps = styled.ol`
  margin: 0;
  padding: 0;
  border-top: 0.0625rem solid var(--color-hairline-soft);
  list-style: none;
`;

const Step = styled.li`
  display: grid;
  grid-template-columns: 4rem minmax(12rem, 0.6fr) 1fr;
  gap: var(--space-xl);
  align-items: center;
  padding: var(--space-xl) 0;
  border-bottom: 0.0625rem solid var(--color-hairline-soft);

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
    text-align: center;

    p {
      grid-column: auto;
    }
  }
`;

const StepNumber = styled.span`
  color: var(--color-ink-subtle);
  font-family: var(--font-mono);
  font-size: 0.75rem;
`;

const StepTitle = styled.h3`
  margin: 0;
  color: var(--color-ink);
  font-size: 1rem;
  font-weight: 600;
`;

const StepText = styled.p`
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  line-height: 1.5;
`;

const Callout = styled.section`
  margin-bottom: var(--space-section);
  padding: clamp(2rem, 7vw, 4rem);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-lg);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }

  @media (max-width: ${breakpoints.mobile}) {
    margin-bottom: var(--space-xxl);
  }
`;

const CalloutTitle = styled.h2`
  max-width: 14ch;
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.04em;

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

const CalloutText = styled.p`
  max-width: 38rem;
  margin: var(--space-lg) 0 var(--space-xl);
  color: var(--color-ink-muted);
  line-height: 1.5;

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

const featureIcons = [Globe2, Pencil, ShieldCheck] as const;
const resultIcons = [FileCheck2, Globe2, Braces, Bot] as const;

export interface HomePageProps {
  readonly language: LanguageCode;
  readonly localized?: boolean;
}

export function HomePage({ language, localized = true }: HomePageProps) {
  const dictionary = getLanguageDictionary(language);
  const uploadPath = localized
    ? createLocalizedPath(language, "upload")
    : createDefaultPath("upload");
  const terminalLines = [
    dictionary.home.terminalGenerated,
    dictionary.home.terminalOpened,
    dictionary.home.terminalPrompt,
    dictionary.home.terminalReady,
  ] as const;

  return (
    <>
      <SiteHeader language={language} route="" localized={localized} />
      <Main>
        <Hero>
          <PageContainer>
            <HeroLayout>
              <div>
                <HeroLogoLink
                  href={uploadPath}
                  aria-label={dictionary.menu.upload}
                >
                  <SiteLogo decorative />
                </HeroLogoLink>
                <Eyebrow>{dictionary.home.eyebrow}</Eyebrow>
                <Title>
                  {dictionary.home.titleLead}{" "}
                  <Accent>{dictionary.home.titleAccent}</Accent>
                </Title>
                <Lead>{dictionary.home.lead}</Lead>
                <HeroActions>
                  <CopyTextButton
                    value={INSTALL_COMMAND}
                    label={dictionary.home.copyInstall}
                    copiedLabel={dictionary.common.copied}
                    errorLabel={dictionary.common.copyError}
                  />
                  <InstallCode>{INSTALL_COMMAND}</InstallCode>
                </HeroActions>
              </div>
              <TerminalCard aria-label={dictionary.home.terminalLabel}>
                <TerminalChrome aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </TerminalChrome>
                <TerminalBody>
                  <CommandLine>
                    <span>$</span> {GENERATE_COMMAND}
                  </CommandLine>
                  {terminalLines.map((line, index) => {
                    const Icon = resultIcons[index] ?? FileText;
                    return (
                      <ResultLine key={line}>
                        <Icon aria-hidden="true" size={15} /> {line}
                      </ResultLine>
                    );
                  })}
                </TerminalBody>
              </TerminalCard>
            </HeroLayout>
          </PageContainer>
        </Hero>

        <ProofStrip>
          <PageContainer>
            <ProofGrid>
              <Proof>
                <ProofValue>{dictionary.home.proofLocalTitle}</ProofValue>
                <ProofText>{dictionary.home.proofLocalText}</ProofText>
              </Proof>
              <Proof>
                <ProofValue>{dictionary.home.proofSafeTitle}</ProofValue>
                <ProofText>
                  {includeDocumentSizeLimit(dictionary.home.proofSafeText)}
                </ProofText>
              </Proof>
              <Proof>
                <ProofValue>{dictionary.home.proofRegistryTitle}</ProofValue>
                <ProofText>{dictionary.home.proofRegistryText}</ProofText>
              </Proof>
            </ProofGrid>
          </PageContainer>
        </ProofStrip>

        <Section>
          <PageContainer>
            <SectionHeader>
              <div>
                <Eyebrow>{dictionary.home.resilienceEyebrow}</Eyebrow>
                <SectionTitle>{dictionary.home.resilienceTitle}</SectionTitle>
              </div>
              <SectionLead>{dictionary.home.resilienceLead}</SectionLead>
            </SectionHeader>
            <FeatureGrid>
              {dictionary.home.features.map((feature, index) => {
                const Icon = featureIcons[index] ?? FileText;
                return (
                  <FeatureCard key={feature.title}>
                    <FeatureIcon>
                      <Icon aria-hidden="true" size={21} />
                    </FeatureIcon>
                    <FeatureTitle>{feature.title}</FeatureTitle>
                    <FeatureText>{feature.text}</FeatureText>
                  </FeatureCard>
                );
              })}
            </FeatureGrid>
          </PageContainer>
        </Section>

        <Section>
          <PageContainer>
            <SectionHeader>
              <div>
                <Eyebrow>{dictionary.home.flowEyebrow}</Eyebrow>
                <SectionTitle>{dictionary.home.flowTitle}</SectionTitle>
              </div>
            </SectionHeader>
            <Steps>
              {dictionary.home.steps.map((step, index) => (
                <Step key={step.title}>
                  <StepNumber>{String(index + 1).padStart(2, "0")}</StepNumber>
                  <StepTitle>{step.title}</StepTitle>
                  <StepText>{includeDocumentSizeLimit(step.text)}</StepText>
                </Step>
              ))}
            </Steps>
          </PageContainer>
        </Section>

        <PageContainer>
          <Callout>
            <CalloutTitle>{dictionary.home.calloutTitle}</CalloutTitle>
            <CalloutText>{dictionary.home.calloutText}</CalloutText>
            <CopyTextButton
              value={GENERATE_COMMAND}
              label={dictionary.home.copyCommand}
              copiedLabel={dictionary.common.copied}
              errorLabel={dictionary.common.copyError}
            />
          </Callout>
        </PageContainer>
      </Main>
      <PageFooter>
        <PageContainer>{dictionary.footer}</PageContainer>
      </PageFooter>
    </>
  );
}
