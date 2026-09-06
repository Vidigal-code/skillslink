"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Bot, ExternalLink, FileUp, Link2, ListTree } from "lucide-react";
import { styled } from "next-yak";
import { abbreviatePortableUrl } from "@skillslink/link-format";

import {
  createPortableDocumentLinkSet,
  type PortableDocumentLinkSet,
} from "@/entities/shared-document";
import { includeDocumentSizeLimit } from "@/shared/config/document";
import { breakpoints } from "@/shared/config/theme.yak";
import { getLanguageDictionary, type LanguageCode } from "@/shared/i18n";
import { useRuntimeUrl } from "@/shared/lib";
import { CopyTextButton } from "@/shared/ui";
import {
  assertSupportedBrowserDocument,
  BrowserDocumentError,
  readBrowserDocument,
} from "../model/read-browser-document";

const URL_PREVIEW_LENGTH = 96;

const Form = styled.form`
  display: grid;
  gap: var(--space-lg);

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;

const Field = styled.label`
  display: grid;
  gap: var(--space-xs);
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 650;
`;

const Hint = styled.span`
  color: var(--color-ink-subtle);
  font-size: 0.8125rem;
  font-weight: 500;
`;

const FileInput = styled.input`
  min-width: 0;
  width: 100%;
  max-width: 100%;
  padding: 1rem;
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-ink-muted);
  cursor: pointer;

  &::file-selector-button {
    margin-right: var(--space-md);
    padding: 0.6rem 0.8rem;
    border: 0;
    border: 0.0625rem solid var(--color-hairline);
    border-radius: var(--radius-sm);
    background: var(--color-surface-1);
    color: var(--color-ink);
    font-weight: 650;
    cursor: pointer;
  }

  @media (max-width: ${breakpoints.compact}) {
    padding: var(--space-sm);
    font-size: 0.75rem;

    &::file-selector-button {
      display: block;
      width: 100%;
      margin: 0 0 var(--space-xs);
    }
  }
`;

const SubmitButton = styled.button`
  display: inline-flex;
  gap: var(--space-xs);
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 2.9rem;
  padding: 0 var(--space-md);
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 500;
  cursor: pointer;

  &:disabled {
    cursor: progress;
    opacity: 0.65;
  }

  &:hover:not(:disabled) {
    opacity: 0.88;
  }

  @media (max-width: ${breakpoints.tablet}) {
    justify-self: center;
    width: 100%;
  }
`;

const ErrorMessage = styled.p`
  margin: 0;
  color: var(--color-error);
  font-size: 0.875rem;
`;

const GenerationStatus = styled.p`
  position: absolute;
  width: 0.0625rem;
  height: 0.0625rem;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const Result = styled.section`
  display: grid;
  gap: var(--space-md);
  margin-top: var(--space-md);
  padding: var(--space-lg);
  border: 0.0625rem solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-2);

  @media (max-width: ${breakpoints.compact}) {
    padding: var(--space-md);
  }
`;

const ResultTitle = styled.h2`
  display: inline-flex;
  gap: var(--space-xs);
  align-items: center;
  margin: 0;
  color: var(--color-ink);
  font-size: 1.25rem;

  @media (max-width: ${breakpoints.tablet}) {
    justify-content: center;
  }
`;

const UrlLabel = styled.label`
  display: grid;
  gap: var(--space-xs);
  color: var(--color-ink-muted);
  font-size: 0.8125rem;
`;

const UrlField = styled.input`
  width: 100%;
  padding: 0.8rem;
  overflow: hidden;
  border: 0.0625rem solid var(--color-hairline-soft);
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  color: var(--color-ink-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ResultActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);

  @media (max-width: ${breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PartCollection = styled.section`
  display: grid;
  gap: var(--space-md);
  padding-top: var(--space-md);
  border-top: 0.0625rem solid var(--color-hairline-soft);
`;

const PartHeading = styled.div`
  display: grid;
  gap: var(--space-xxs);

  h3 {
    display: inline-flex;
    gap: var(--space-xs);
    align-items: center;
    margin: 0;
    color: var(--color-ink);
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: var(--color-ink-muted);
    font-size: 0.8125rem;
    line-height: 1.55;
  }

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;

    h3 {
      justify-content: center;
    }
  }
`;

const PartList = styled.ol`
  display: grid;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
`;

const PartItem = styled.li`
  display: grid;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: 0.0625rem solid var(--color-hairline-soft);
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-raised);
`;

const PartTitleRow = styled.div`
  display: flex;
  gap: var(--space-sm);
  align-items: baseline;
  justify-content: space-between;

  strong {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--color-ink);
    font-size: 0.875rem;
  }

  span {
    flex: none;
    color: var(--color-accent-bright);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 700;
  }

  @media (max-width: ${breakpoints.tablet}) {
    flex-direction: column;
    gap: var(--space-xxs);
    align-items: center;
    text-align: center;
  }
`;

const FullLinkNotice = styled.div`
  padding: var(--space-md);
  border: 0.0625rem solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);

  strong,
  p {
    margin: 0;
  }

  strong {
    color: var(--color-ink);
    font-size: 0.875rem;
  }

  p {
    margin-top: var(--space-xxs);
    color: var(--color-ink-muted);
    font-size: 0.8125rem;
    line-height: 1.55;
  }

  @media (max-width: ${breakpoints.tablet}) {
    text-align: center;
  }
`;

const PromptField = styled.textarea`
  width: 100%;
  min-height: 14rem;
  padding: 0.8rem;
  resize: vertical;
  border: 0.0625rem solid var(--color-hairline-soft);
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  color: var(--color-ink-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.55;
`;

const OpenLink = styled.a`
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
    opacity: 0.88;
  }

  @media (max-width: ${breakpoints.tablet}) {
    width: 100%;
  }
`;

export interface GenerateDocumentLinkFormProps {
  readonly language: LanguageCode;
  readonly viewerSiteUrl: string;
}

export function GenerateDocumentLinkForm({
  language,
  viewerSiteUrl,
}: GenerateDocumentLinkFormProps) {
  const dictionary = getLanguageDictionary(language);
  const runtimeViewerSiteUrl = useRuntimeUrl(viewerSiteUrl);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [generatedLinks, setGeneratedLinks] =
    useState<PortableDocumentLinkSet>();
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);

  function getDocumentErrorMessage(error: unknown): string {
    if (
      error instanceof BrowserDocumentError &&
      error.code === "FILE_TOO_LARGE"
    ) {
      return includeDocumentSizeLimit(dictionary.upload.errors.fileTooLarge);
    }

    return includeDocumentSizeLimit(dictionary.upload.errors.invalidFile);
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    setSelectedFile(file);
    setGeneratedLinks(undefined);

    if (file === undefined) {
      setError(undefined);
      return;
    }

    try {
      assertSupportedBrowserDocument(file);
      setError(undefined);
    } catch (caughtError) {
      setError(getDocumentErrorMessage(caughtError));
    }
  }

  async function generateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedFile === undefined) {
      setError(dictionary.upload.errors.fileRequired);
      return;
    }

    setWorking(true);
    setError(undefined);
    try {
      const document = await readBrowserDocument(selectedFile);
      setGeneratedLinks(
        createPortableDocumentLinkSet(document, runtimeViewerSiteUrl),
      );
    } catch (caughtError) {
      setGeneratedLinks(undefined);
      setError(
        caughtError instanceof Error
          ? getDocumentErrorMessage(caughtError)
          : dictionary.upload.errors.unexpected,
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <Form onSubmit={generateLink} noValidate>
      <Field>
        {dictionary.upload.fileLabel}
        <Hint id="document-file-hint">
          {includeDocumentSizeLimit(dictionary.upload.fileHint)}
        </Hint>
        <FileInput
          type="file"
          accept=".md,text/markdown"
          aria-describedby={
            error === undefined
              ? "document-file-hint"
              : "document-file-hint document-file-error"
          }
          aria-invalid={error !== undefined}
          required
          onChange={selectFile}
        />
      </Field>
      {error === undefined ? null : (
        <ErrorMessage id="document-file-error" role="alert">
          {error}
        </ErrorMessage>
      )}
      <SubmitButton type="submit" disabled={working}>
        <FileUp aria-hidden="true" size={17} />
        {working
          ? dictionary.upload.workingAction
          : dictionary.upload.generateAction}
      </SubmitButton>

      {generatedLinks === undefined ? null : (
        <Result>
          <GenerationStatus role="status" aria-live="polite">
            {dictionary.upload.resultTitle}
          </GenerationStatus>
          <ResultTitle>
            <Link2 aria-hidden="true" size={19} />
            {dictionary.upload.resultTitle}
          </ResultTitle>
          <PartCollection>
            <PartHeading>
              <h3>
                <Bot aria-hidden="true" size={17} />
                {dictionary.upload.aiPromptTitle}
              </h3>
              <p>{dictionary.upload.aiPromptText}</p>
            </PartHeading>
            <UrlLabel>
              {dictionary.upload.aiPromptLabel}
              <PromptField readOnly value={generatedLinks.aiPrompt} />
            </UrlLabel>
            <ResultActions>
              <CopyTextButton
                value={generatedLinks.aiPrompt}
                label={dictionary.upload.copyAiPrompt}
                copiedLabel={dictionary.common.copied}
                errorLabel={dictionary.common.copyError}
              />
            </ResultActions>
          </PartCollection>
          {generatedLinks.showFullUrl ? (
            <>
              <UrlLabel>
                {dictionary.upload.viewerUrlLabel}
                <UrlField
                  type="text"
                  readOnly
                  title={generatedLinks.fullUrl}
                  value={abbreviatePortableUrl(
                    generatedLinks.fullUrl,
                    URL_PREVIEW_LENGTH,
                  )}
                />
              </UrlLabel>
              <ResultActions>
                <CopyTextButton
                  key={generatedLinks.fullUrl}
                  value={generatedLinks.fullUrl}
                  label={dictionary.upload.copyViewerUrl}
                  copiedLabel={dictionary.common.copied}
                  errorLabel={dictionary.common.copyError}
                />
                <OpenLink href={generatedLinks.fullUrl}>
                  <ExternalLink aria-hidden="true" size={16} />
                  {dictionary.upload.openViewer}
                </OpenLink>
              </ResultActions>
            </>
          ) : (
            <FullLinkNotice>
              <strong>{dictionary.upload.fullLinkHiddenTitle}</strong>
              <p>
                {includeDocumentSizeLimit(dictionary.upload.fullLinkHiddenText)}
              </p>
            </FullLinkNotice>
          )}
          {generatedLinks.parts.length === 0 ? null : (
            <PartCollection>
              <PartHeading>
                <h3>
                  <ListTree aria-hidden="true" size={17} />
                  {dictionary.upload.partLinksTitle}
                </h3>
                <p>{dictionary.upload.partLinksText}</p>
              </PartHeading>
              <PartList>
                {generatedLinks.parts.map((part) => (
                  <PartItem key={part.url}>
                    <PartTitleRow>
                      <strong>{part.title}</strong>
                      <span>
                        {part.headingLevel === null
                          ? dictionary.upload.partLabel
                          : `H${part.headingLevel}`}
                        {" · "}
                        {dictionary.upload.partSize.replace(
                          "{bytes}",
                          String(part.byteLength),
                        )}
                      </span>
                    </PartTitleRow>
                    <UrlLabel>
                      {dictionary.upload.partLinkLabel}
                      <UrlField
                        type="text"
                        readOnly
                        title={part.url}
                        value={abbreviatePortableUrl(
                          part.url,
                          URL_PREVIEW_LENGTH,
                        )}
                      />
                    </UrlLabel>
                    <ResultActions>
                      <CopyTextButton
                        value={part.url}
                        label={dictionary.upload.copyPartUrl}
                        copiedLabel={dictionary.common.copied}
                        errorLabel={dictionary.common.copyError}
                      />
                      <OpenLink href={part.url}>
                        <ExternalLink aria-hidden="true" size={16} />
                        {dictionary.upload.openPart}
                      </OpenLink>
                    </ResultActions>
                  </PartItem>
                ))}
              </PartList>
            </PartCollection>
          )}
        </Result>
      )}
    </Form>
  );
}
