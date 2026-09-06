import { globalStyle } from "next-yak";

export const globalStyles = globalStyle`
  :root,
  :root[data-theme="dark"] {
    color-scheme: dark;
    --color-canvas: #000000;
    --color-surface-1: #0a0a0a;
    --color-surface-2: #111111;
    --color-surface-3: #1a1a1a;
    --color-ink: #ededed;
    --color-ink-muted: #a1a1a1;
    --color-ink-subtle: #888888;
    --color-hairline: #2e2e2e;
    --color-hairline-soft: #1f1f1f;
    --color-primary: #ededed;
    --color-on-primary: #0a0a0a;
    --color-accent-dark: #c7b6ff;
    --color-accent-deep: #7c5cf4;
    --color-accent: #a78bfa;
    --color-accent-bright: #59e4eb;
    --color-accent-soft: rgba(124, 92, 244, 0.18);
    --color-success: #59e4eb;
    --color-brand-cyan: #59e4eb;
    --color-brand-violet: #a78bfa;
    --color-brand-purple: #7c5cf4;
    --color-brand-indigo: #5365ed;
    --color-brand-text-start: #c7b6ff;
    --color-brand-text-end: #59e4eb;
    --color-brand-cyan-glow: rgba(89, 228, 235, 0.2);
    --color-brand-violet-glow: rgba(167, 139, 250, 0.28);
    --color-brand-purple-glow: rgba(124, 92, 244, 0.3);
    --color-brand-indigo-glow: rgba(83, 101, 237, 0.26);
    --color-warning: #f5a623;
    --color-warning-soft: rgba(245, 166, 35, 0.12);
    --color-error: #ff6166;
    --color-error-soft: rgba(255, 97, 102, 0.12);
    --color-inverse: #0a0a0a;
    --shadow-raised: 0 1px 1px rgba(0, 0, 0, 0.24);
    --shadow-floating:
      0 2px 2px rgba(0, 0, 0, 0.22), 0 8px 24px -8px rgba(0, 0, 0, 0.7);
    --font-sans:
      var(--font-geist-sans, "Geist Sans"), Arial, Helvetica, sans-serif;
    --font-mono:
      var(--font-geist-mono, "Geist Mono"), "SFMono-Regular", Consolas,
      "Liberation Mono", monospace;
    --radius-xs: 0.25rem;
    --radius-sm: 0.375rem;
    --radius-md: 0.75rem;
    --radius-lg: 1rem;
    --radius-xl: 1rem;
    --radius-xxl: 1rem;
    --radius-pill: 6.25rem;
    --space-xxs: 0.25rem;
    --space-xs: 0.5rem;
    --space-sm: 0.75rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-xxl: 4rem;
    --space-section: 8rem;
  }

  :root[data-theme="light"] {
    color-scheme: light;
    --color-canvas: #fafafa;
    --color-surface-1: #ffffff;
    --color-surface-2: #f2f2f2;
    --color-surface-3: #ebebeb;
    --color-ink: #171717;
    --color-ink-muted: #4d4d4d;
    --color-ink-subtle: #666666;
    --color-hairline: #dedede;
    --color-hairline-soft: #ebebeb;
    --color-primary: #171717;
    --color-on-primary: #ffffff;
    --color-accent-dark: #5365ed;
    --color-accent-deep: #5365ed;
    --color-accent: #5365ed;
    --color-accent-bright: #5365ed;
    --color-accent-soft: rgba(124, 92, 244, 0.14);
    --color-success: #5365ed;
    --color-brand-cyan: #59e4eb;
    --color-brand-violet: #a78bfa;
    --color-brand-purple: #7c5cf4;
    --color-brand-indigo: #5365ed;
    --color-brand-text-start: #5365ed;
    --color-brand-text-end: #7c5cf4;
    --color-brand-cyan-glow: rgba(89, 228, 235, 0.18);
    --color-brand-violet-glow: rgba(167, 139, 250, 0.22);
    --color-brand-purple-glow: rgba(124, 92, 244, 0.2);
    --color-brand-indigo-glow: rgba(83, 101, 237, 0.18);
    --color-warning: #ab570a;
    --color-warning-soft: #ffefcf;
    --color-error: #ee0000;
    --color-error-soft: #ffe1e1;
    --color-inverse: #ffffff;
    --shadow-raised: 0 1px 1px rgba(0, 0, 0, 0.04);
    --shadow-floating:
      0 2px 2px rgba(0, 0, 0, 0.04), 0 8px 24px -8px rgba(0, 0, 0, 0.18);
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    min-width: 20rem;
    background: var(--color-canvas);
    scroll-behavior: smooth;
  }

  body {
    overflow-x: hidden;
    min-height: 100vh;
    min-height: 100dvh;
    margin: 0;
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
    text-rendering: optimizeLegibility;
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }

  button,
  input,
  textarea,
  select {
    color: inherit;
    font: inherit;
  }

  button,
  a,
  summary {
    -webkit-tap-highlight-color: transparent;
  }

  button {
    touch-action: manipulation;
  }

  a {
    color: inherit;
  }

  ::selection {
    background: var(--color-accent-soft);
    color: var(--color-ink);
  }

  :focus-visible {
    outline: 0.125rem solid var(--color-accent);
    outline-offset: 0.125rem;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }

    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
