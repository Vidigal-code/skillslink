import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { styled } from "next-yak";

import type { SharedDocument } from "@skillslink/link-format";
import { breakpoints, layout } from "@/shared/config/theme.yak";

const Markdown = styled.article`
  width: 100%;
  max-width: ${layout.readingWidth};
  color: var(--color-ink-muted);
  font-size: 1rem;
  line-height: 1.625;
  overflow-wrap: anywhere;

  h1,
  h2,
  h3,
  h4 {
    color: var(--color-ink);
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.03em;
    scroll-margin-top: 5rem;
  }

  h1 {
    margin: 0 0 2rem;
    font-size: clamp(2rem, 5vw, 2.5rem);
  }

  h2 {
    margin: 3.5rem 0 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 0.0625rem solid var(--color-hairline-soft);
    font-size: clamp(1.5rem, 4vw, 2rem);
  }

  h3 {
    margin: 2.5rem 0 0.75rem;
    font-size: 1.25rem;
  }

  p,
  ul,
  ol,
  blockquote,
  table,
  pre {
    margin: 0 0 1.5rem;
  }

  ul,
  ol {
    padding-left: 1.4rem;
  }

  li + li {
    margin-top: 0.4rem;
  }

  strong {
    color: var(--color-ink);
    font-weight: 600;
  }

  a {
    color: var(--color-accent-bright);
    text-decoration-thickness: 0.08em;
    text-underline-offset: 0.18em;
  }

  a:hover {
    color: var(--color-ink);
  }

  blockquote {
    padding: 0.25rem 0 0.25rem 1.25rem;
    border-left: 0.125rem solid var(--color-hairline);
    color: var(--color-ink-muted);
  }

  code {
    border: 0.0625rem solid var(--color-hairline-soft);
    border-radius: var(--radius-sm);
    background: var(--color-surface-2);
    color: var(--color-ink);
    font-family: var(--font-mono);
    font-size: 0.88em;
    padding: 0.15em 0.35em;
  }

  pre {
    max-width: 100%;
    padding: 1.25rem;
    overflow-x: auto;
    border: 0.0625rem solid var(--color-hairline);
    border-radius: var(--radius-md);
    background: var(--color-surface-2);
  }

  pre code {
    padding: 0;
    border: 0;
    background: transparent;
    font-size: 0.875rem;
  }

  table {
    display: block;
    width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.75rem 1rem;
    border: 0.0625rem solid var(--color-hairline-soft);
    text-align: left;
  }

  th {
    background: var(--color-surface-2);
    color: var(--color-ink);
  }

  hr {
    margin: 3rem 0;
    border: 0;
    border-top: 0.0625rem solid var(--color-hairline-soft);
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-lg);
  }

  @media (max-width: ${breakpoints.compact}) {
    font-size: 0.9375rem;
  }
`;

export interface DocumentContentProps {
  readonly document: SharedDocument;
}

export function DocumentContent({ document }: DocumentContentProps) {
  return (
    <Markdown>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {document.content}
      </ReactMarkdown>
    </Markdown>
  );
}
