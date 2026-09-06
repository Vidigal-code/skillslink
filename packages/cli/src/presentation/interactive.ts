import { dirname, extname, join, resolve } from "node:path";

import {
  cancel,
  confirm,
  isCancel,
  path,
  select,
  text as textPrompt,
} from "@clack/prompts";

import {
  createRegisteredLinkTargets,
  getRegisteredLinkTarget,
} from "../application/find-registered-link-target";
import { getGeneratedLink } from "../application/get-generated-link";
import { normalizePathForComparison } from "../config/runtime-config";
import { CliError } from "../domain/cli-error";
import type {
  GeneratedLink,
  LinkRegistry,
  RegisteredLinkTarget,
} from "../domain/registry";
import { abbreviate, formatTimestamp } from "./output";

const LINK_CHOICE_PREVIEW_LENGTH = 48;
const JSON_EXTENSION = ".json";

export interface InitialStoragePaths {
  readonly configFilePath: string;
  readonly linksFilePath: string;
}

export type InteractiveCommand =
  | "generate"
  | "list"
  | "open"
  | "copy"
  | "download"
  | "prompt"
  | "copy-prompt"
  | "remove"
  | "config"
  | "where";

export function isInteractiveSession(jsonOutput = false): boolean {
  return (
    !jsonOutput && process.stdin.isTTY === true && process.stdout.isTTY === true
  );
}

export async function resolveInteractiveCommand(): Promise<
  InteractiveCommand | undefined
> {
  const result = await select<InteractiveCommand>({
    message: "What would you like to do?",
    options: [
      { value: "generate", label: "Generate a document link" },
      { value: "list", label: "Show one registered document" },
      { value: "open", label: "Open a registered link" },
      { value: "copy", label: "Copy a registered link" },
      { value: "download", label: "Download a registered document" },
      { value: "prompt", label: "Create an AI learning prompt" },
      { value: "copy-prompt", label: "Copy an AI learning prompt" },
      { value: "remove", label: "Remove a registered link" },
      { value: "config", label: "Show configuration" },
      { value: "where", label: "Show link-store path" },
    ],
  });
  return handleCancellation(result, "SkillsLink closed.");
}

export async function resolveInitialStoragePaths(
  defaults: InitialStoragePaths,
): Promise<InitialStoragePaths | undefined> {
  const configResult = await textPrompt({
    message: "Where should SkillsLink save config.json?",
    initialValue: defaults.configFilePath,
    validate: validateJsonFilePath,
  });
  const selectedConfigPath = handleCancellation(
    configResult,
    "Initial setup cancelled.",
  );
  if (selectedConfigPath === undefined) {
    return undefined;
  }

  const configFilePath = resolve(selectedConfigPath);
  const suggestedLinksPath =
    configFilePath === resolve(defaults.configFilePath)
      ? defaults.linksFilePath
      : join(dirname(configFilePath), "links.json");
  const linksResult = await textPrompt({
    message: "Where should SkillsLink save links.json?",
    initialValue: suggestedLinksPath,
    validate(value) {
      const formatError = validateJsonFilePath(value);
      if (formatError !== undefined) {
        return formatError;
      }
      return normalizePathForComparison(value ?? "") ===
        normalizePathForComparison(configFilePath)
        ? "config.json and links.json must use different paths."
        : undefined;
    },
  });
  const selectedLinksPath = handleCancellation(
    linksResult,
    "Initial setup cancelled.",
  );
  if (selectedLinksPath === undefined) {
    return undefined;
  }

  return {
    configFilePath,
    linksFilePath: resolve(selectedLinksPath),
  };
}

export async function resolveSourcePath(
  filePath: string | undefined,
  interactive: boolean,
): Promise<string | undefined> {
  if (filePath !== undefined) {
    return filePath;
  }

  assertInteractive(interactive, "A .md file path is required.");
  const result = await path({
    message: "Choose a Markdown file",
    root: process.cwd(),
    directory: false,
    validate(value) {
      return typeof value === "string" && /\.md$/iu.test(value)
        ? undefined
        : "Choose a file ending in .md.";
    },
  });
  return handleCancellation(result, "Link generation cancelled.");
}

export async function resolveDestinationDirectory(
  directoryPath: string | undefined,
  interactive: boolean,
): Promise<string | undefined> {
  if (directoryPath !== undefined) {
    return directoryPath;
  }

  if (!interactive) {
    return process.cwd();
  }

  const result = await path({
    message: "Choose the directory for the recovered document",
    root: process.cwd(),
    directory: true,
    initialValue: process.cwd(),
  });
  return handleCancellation(result, "Download cancelled.");
}

export async function resolveRegisteredLink(
  registry: LinkRegistry,
  identifier: string | undefined,
  action: string,
  interactive: boolean,
): Promise<RegisteredLinkTarget | undefined> {
  if (identifier !== undefined) {
    return getRegisteredLinkTarget(identifier, registry);
  }

  assertInteractive(
    interactive,
    `An ID or file name is required to ${action} a registered link.`,
  );
  const targets = createRegisteredLinkTargets(registry);
  if (targets.length === 0) {
    throw new CliError("REGISTRY_ERROR", "No URLs are registered.");
  }

  const result = await select<string>({
    message: `Choose a link to ${action}`,
    options: targets.map((target) => ({
      value: target.id,
      label: target.kind === "document" ? target.name : `  ${target.title}`,
      hint: `${formatTimestamp(target.createdAt)} · ${abbreviate(target.url, LINK_CHOICE_PREVIEW_LENGTH)}`,
    })),
  });
  const selectedId = handleCancellation(result, "Command cancelled.");
  return selectedId === undefined
    ? undefined
    : getRegisteredLinkTarget(selectedId, registry);
}

export async function resolveRegisteredDocument(
  registry: LinkRegistry,
  identifier: string | undefined,
  action: string,
  interactive: boolean,
): Promise<GeneratedLink | undefined> {
  if (identifier !== undefined) {
    return getGeneratedLink(identifier, registry);
  }

  assertInteractive(
    interactive,
    `An ID or file name is required to ${action} a registered document.`,
  );
  if (registry.links.length === 0) {
    throw new CliError("REGISTRY_ERROR", "No URLs are registered.");
  }

  const result = await select<string>({
    message: `Choose a document ID to ${action}`,
    options: registry.links.map((link) => ({
      value: link.id,
      label: link.id,
      hint: `${link.name} | ${formatTimestamp(link.createdAt)}`,
    })),
  });
  const selectedId = handleCancellation(result, "Command cancelled.");
  return selectedId === undefined
    ? undefined
    : getGeneratedLink(selectedId, registry);
}

export async function askForConfirmation(
  message: string,
  cancellationMessage: string,
  initialValue: boolean,
): Promise<boolean> {
  const result = await confirm({ message, initialValue });
  if (isCancel(result)) {
    cancel(cancellationMessage);
    return false;
  }

  return result;
}

function assertInteractive(
  interactive: boolean,
  message: string,
): asserts interactive {
  if (!interactive) {
    throw new CliError("CONFIGURATION_ERROR", message);
  }
}

function handleCancellation<Value extends string>(
  result: Value | symbol,
  message: string,
): Value | undefined {
  if (isCancel(result)) {
    cancel(message);
    return undefined;
  }

  return result;
}

function validateJsonFilePath(value: string | undefined): string | undefined {
  return value !== undefined &&
    extname(value).toLocaleLowerCase("en-US") === JSON_EXTENSION
    ? undefined
    : "Choose a file ending in .json.";
}
