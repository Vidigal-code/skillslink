import type { Command } from "commander";

import type { GeneratedLink } from "../../domain/registry";
import {
  resolveCommandTarget,
  type ArgumentAction,
  type CommandContext,
} from "../command-context";
import {
  isInteractiveSession,
  resolveRegisteredDocument,
  type RegisteredTargetAction,
} from "../interactive";
import { createRegisteredLinkPrompt } from "../output";

export interface PromptOptions {
  readonly copy?: boolean;
}

interface PromptSelector {
  readonly identifier: string | undefined;
  readonly command: Command;
}

interface RegisteredPrompt {
  readonly link: GeneratedLink;
  readonly prompt: string;
}

export function createPromptAction(
  context: CommandContext,
): ArgumentAction<PromptOptions> {
  return (identifier, options, command) =>
    options.copy === true
      ? copyRegisteredPrompt(context, { identifier, command })
      : printRegisteredPrompt(context, { identifier, command });
}

export function createCopyPromptAction(
  context: CommandContext,
): ArgumentAction<unknown> {
  return (identifier, _options, command) =>
    copyRegisteredPrompt(context, { identifier, command });
}

async function printRegisteredPrompt(
  context: CommandContext,
  selector: PromptSelector,
): Promise<void> {
  const registeredPrompt = await resolveRegisteredPrompt(
    context,
    selector,
    "create a prompt for",
  );
  if (registeredPrompt !== undefined) {
    context.output.write(registeredPrompt.prompt);
  }
}

async function copyRegisteredPrompt(
  context: CommandContext,
  selector: PromptSelector,
): Promise<void> {
  const registeredPrompt = await resolveRegisteredPrompt(
    context,
    selector,
    "copy a prompt for",
  );
  if (registeredPrompt === undefined) {
    return;
  }

  const { link, prompt } = registeredPrompt;
  await context.services.copyText(prompt);
  context.output.write(`AI prompt copied: ${link.name} (${link.id})`);
}

async function resolveRegisteredPrompt(
  context: CommandContext,
  selector: PromptSelector,
  action: RegisteredTargetAction,
): Promise<RegisteredPrompt | undefined> {
  const resolved = await resolveCommandTarget(
    context,
    { ...selector, action, interactive: isInteractiveSession() },
    resolveRegisteredDocument,
  );
  if (resolved === undefined) {
    return undefined;
  }

  return {
    link: resolved.target,
    prompt: createRegisteredLinkPrompt(resolved.target, "divided"),
  };
}
