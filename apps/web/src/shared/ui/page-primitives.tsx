import { styled } from "next-yak";

import { breakpoints, layout } from "@/shared/config/theme.yak";

export const PageContainer = styled.div`
  width: min(calc(100% - 3rem), ${layout.contentWidth});
  min-width: 0;
  margin: 0 auto;

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }

  @media (max-width: ${breakpoints.mobile}) {
    width: min(calc(100% - 2rem), ${layout.contentWidth});
  }

  @media (max-width: ${breakpoints.compact}) {
    width: min(calc(100% - 1.5rem), ${layout.contentWidth});
  }
`;

export const PageMain = styled.main`
  min-height: calc(100vh - ${layout.headerHeight});
  min-height: calc(100dvh - ${layout.headerHeight});
  padding: clamp(4rem, 9vw, 6rem) 0 var(--space-section);

  @media (max-width: ${breakpoints.mobile}) {
    padding: var(--space-xxl) 0;
  }
`;

export const PageEyebrow = styled.p`
  margin: 0 0 var(--space-md);
  color: var(--color-ink-subtle);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
  text-transform: uppercase;
`;

export const PageTitle = styled.h1`
  max-width: 18ch;
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(2.5rem, 6vw, 3rem);
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

export const PageLead = styled.p`
  max-width: 46rem;
  margin: var(--space-lg) 0 0;
  color: var(--color-ink-muted);
  font-size: 1rem;
  line-height: 1.5;

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

export const ContentPanel = styled.section`
  margin-top: var(--space-xxl);
  padding: clamp(1.5rem, 4vw, 2rem);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);

  @media (max-width: ${breakpoints.tablet}) {
    text-align: left;
  }

  @media (max-width: ${breakpoints.compact}) {
    padding: var(--space-md);
  }
`;

export const PageFooter = styled.footer`
  padding: var(--space-xl) 0;
  border-top: 0.0625rem solid var(--color-hairline-soft);
  color: var(--color-ink-subtle);
  font-size: 0.75rem;

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;
