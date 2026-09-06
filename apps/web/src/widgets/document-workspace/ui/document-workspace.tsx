"use client";

import { useState, type FormEvent } from "react";
import { Download, Pencil, Save, X } from "lucide-react";
import { styled } from "next-yak";

import {
  MAX_DOCUMENT_BYTES,
  type SharedDocument,
} from "@skillslink/link-format";
import {
  createDocumentFromDraft,
  createPortableDocumentUrl,
  DocumentContent,
  formatDocumentType,
} from "@/entities/shared-document";
import { includeDocumentSizeLimit } from "@/shared/config/document";
import { breakpoints, layout } from "@/shared/config/theme.yak";
import { getLanguageDictionary, type LanguageCode } from "@/shared/i18n";
import { useRuntimeUrl } from "@/shared/lib";
import { CopyTextButton } from "@/shared/ui";

const Header = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-xl);
  align-items: end;
  margin-bottom: var(--space-xxl);
  padding-bottom: var(--space-xl);
  border-bottom: 0.0625rem solid var(--color-hairline-soft);

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
    text-align: center;
  }
`;

const Label = styled.p`
  margin: 0 0 var(--space-sm);
  color: var(--color-ink-subtle);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
`;

const Name = styled.h1`
  max-width: 20ch;
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(2.25rem, 5vw, 3rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.05em;
  overflow-wrap: anywhere;

  @media (max-width: ${breakpoints.tablet}) {
    margin-inline: auto;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);

  @media (max-width: ${breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ActionButton = styled.button`
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

  &:hover {
    border-color: var(--color-ink-subtle);
    background: var(--color-surface-2);
  }

  @media (max-width: ${breakpoints.tablet}) {
    width: 100%;
  }
`;

const RawLink = styled.a`
  display: inline-flex;
  gap: var(--space-xs);
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0 var(--space-md);
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    opacity: 0.84;
  }

  @media (max-width: ${breakpoints.tablet}) {
    width: 100%;
  }
`;

const Editor = styled.form`
  display: grid;
  gap: var(--space-lg);
  max-width: ${layout.readingWidth};
  margin: 0 auto var(--space-xl);
  padding: clamp(1.25rem, 4vw, 2rem);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);
`;

const EditorTitle = styled.h2`
  margin: 0;
  color: var(--color-ink);
  font-size: 1.25rem;
  font-weight: 600;

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;

const Field = styled.label`
  display: grid;
  gap: var(--space-xs);
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  min-height: 2.75rem;
  padding: 0.7rem 0.8rem;
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-ink);
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 22rem;
  padding: 1rem;
  resize: vertical;
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.6;
`;

const EditorFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
  justify-content: space-between;

  @media (max-width: ${breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
`;

const ByteCount = styled.span`
  color: var(--color-ink-subtle);
  font-family: var(--font-mono);
  font-size: 0.75rem;
`;

const ErrorMessage = styled.p`
  margin: 0;
  color: var(--color-error);
  font-size: 0.875rem;
`;

const Notice = styled.p`
  max-width: ${layout.readingWidth};
  margin: 0 auto var(--space-lg);
  padding: var(--space-sm) var(--space-md);
  border: 0.0625rem solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
  color: var(--color-ink-muted);
  font-size: 0.875rem;

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;

const ReadingSurface = styled.div`
  display: flex;
  justify-content: center;
  padding: clamp(1.5rem, 5vw, 4rem);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);

  @media (max-width: ${breakpoints.compact}) {
    padding: var(--space-md);
  }
`;

export interface DocumentWorkspaceProps {
  readonly initialDocument: SharedDocument;
  readonly viewerSiteUrl: string;
  readonly language: LanguageCode;
  readonly rawUrl?: string;
  readonly label?: string;
}

export function DocumentWorkspace({
  initialDocument,
  viewerSiteUrl,
  language,
  rawUrl,
  label,
}: DocumentWorkspaceProps) {
  const dictionary = getLanguageDictionary(language);
  const runtimeViewerSiteUrl = useRuntimeUrl(viewerSiteUrl);
  const runtimeRawUrl = useRuntimeUrl(rawUrl ?? viewerSiteUrl);
  const [document, setDocument] = useState(initialDocument);
  const [name, setName] = useState(initialDocument.name);
  const [content, setContent] = useState(initialDocument.content);
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [updated, setUpdated] = useState(false);
  const currentUrl = createPortableDocumentUrl(document, runtimeViewerSiteUrl);
  const byteLength = new TextEncoder().encode(content).byteLength;
  const byteCount = dictionary.document.byteCount
    .replace("{current}", String(byteLength))
    .replace("{maximum}", String(MAX_DOCUMENT_BYTES));

  function updateUrl(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    try {
      const nextDocument = createDocumentFromDraft({ name, content });
      const nextUrl = createPortableDocumentUrl(
        nextDocument,
        runtimeViewerSiteUrl,
      );
      const target = new URL(nextUrl);
      if (target.origin === window.location.origin) {
        if (target.pathname !== window.location.pathname) {
          window.location.assign(nextUrl);
          return;
        }
        window.history.replaceState({}, "", nextUrl);
      }
      setDocument(nextDocument);
      setUpdated(true);
      setError(undefined);
      setEditorOpen(false);
    } catch {
      setError(includeDocumentSizeLimit(dictionary.document.validationError));
    }
  }

  return (
    <>
      <Header>
        <div>
          <Label>
            {label ?? dictionary.document.recoveredLabel} ·{" "}
            {formatDocumentType(dictionary.common)}
          </Label>
          <Name>{document.name}</Name>
        </div>
        <Actions aria-label={dictionary.document.actionsLabel}>
          <CopyTextButton
            key={currentUrl}
            value={currentUrl}
            label={dictionary.document.copyFullUrl}
            copiedLabel={dictionary.common.copied}
            errorLabel={dictionary.common.copyError}
          />
          {rawUrl !== undefined && !updated ? (
            <RawLink href={runtimeRawUrl}>
              <Download aria-hidden="true" size={16} />
              {dictionary.document.openRaw}
            </RawLink>
          ) : null}
          <ActionButton
            type="button"
            aria-expanded={editorOpen}
            onClick={() => setEditorOpen((value) => !value)}
          >
            {editorOpen ? (
              <X aria-hidden="true" size={16} />
            ) : (
              <Pencil aria-hidden="true" size={16} />
            )}
            {editorOpen
              ? dictionary.document.closeEditor
              : dictionary.document.editAction}
          </ActionButton>
        </Actions>
      </Header>

      {editorOpen ? (
        <Editor onSubmit={updateUrl} noValidate>
          <EditorTitle>{dictionary.document.editorTitle}</EditorTitle>
          <Field>
            {dictionary.document.nameLabel}
            <Input
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field>
            {dictionary.document.contentLabel}
            <TextArea
              value={content}
              onChange={(event) => setContent(event.currentTarget.value)}
              spellCheck={document.mediaType === "text/markdown"}
            />
          </Field>
          {error === undefined ? null : (
            <ErrorMessage role="alert">{error}</ErrorMessage>
          )}
          <EditorFooter>
            <ByteCount>{byteCount}</ByteCount>
            <ActionButton type="submit">
              <Save aria-hidden="true" size={16} />
              {dictionary.document.updateUrl}
            </ActionButton>
          </EditorFooter>
        </Editor>
      ) : null}

      {updated ? (
        <Notice role="status">{dictionary.document.updatedNotice}</Notice>
      ) : null}

      <ReadingSurface>
        <DocumentContent document={document} />
      </ReadingSurface>
    </>
  );
}
