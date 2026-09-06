"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { styled } from "next-yak";

const Button = styled.button`
  display: inline-flex;
  gap: var(--space-xs);
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0 var(--space-sm);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease;

  &:hover {
    border-color: var(--color-ink-subtle);
    background: var(--color-surface-2);
  }

  &:active {
    background: var(--color-surface-3);
  }
`;

const Status = styled.span`
  position: absolute;
  width: 0.0625rem;
  height: 0.0625rem;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
`;

export interface CopyTextButtonProps {
  readonly value: string;
  readonly label: string;
  readonly copiedLabel: string;
  readonly errorLabel: string;
}

export function CopyTextButton({
  value,
  label,
  copiedLabel,
  errorLabel,
}: CopyTextButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const isCopied = status === "copied";

  async function copyValue(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Button type="button" onClick={copyValue}>
      {isCopied ? (
        <Check aria-hidden="true" size={16} />
      ) : (
        <Copy aria-hidden="true" size={16} />
      )}
      {isCopied ? copiedLabel : label}
      <Status aria-live="polite">{status === "error" ? errorLabel : ""}</Status>
    </Button>
  );
}
