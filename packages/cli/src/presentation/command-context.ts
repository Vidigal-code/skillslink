import type { Command } from "commander";

import type {
  Clock,
  DocumentDestinationWriter,
  DocumentSourceReader,
  IdentifierGenerator,
} from "../application/ports";
import {
  createStorageSession,
  type StorageRuntime,
  type StorageSelectors,
  type StorageSession,
} from "./create-storage-session";
import type { RegisteredTargetLookup } from "./interactive";
import type { CliOutput } from "./output";

const JSON_INDENTATION = 2;

export interface ProgramServices {
  readonly clock: Clock;
  readonly identifierGenerator: IdentifierGenerator;
  readonly sourceReader: DocumentSourceReader;
  readonly documentWriter: DocumentDestinationWriter;
  readonly openUrl: (url: string) => Promise<void>;
  readonly copyText: (value: string) => Promise<void>;
  readonly storageRuntime?: StorageRuntime;
}

export interface CommandContext {
  readonly output: CliOutput;
  readonly services: ProgramServices;
}

export type ArgumentAction<TOptions> = (
  argument: string | undefined,
  options: TOptions,
  command: Command,
) => Promise<void>;

export type OptionsAction<TOptions> = (
  options: TOptions,
  command: Command,
) => Promise<void>;

export interface CommandRequest {
  readonly command: Command;
  readonly interactive: boolean;
}

export interface RegisteredTargetRequest
  extends CommandRequest, Omit<RegisteredTargetLookup, "registry"> {}

export type RegisteredTargetResolver<TTarget> = (
  lookup: RegisteredTargetLookup,
) => Promise<TTarget | undefined>;

export interface ResolvedTarget<TTarget> {
  readonly storage: StorageSession;
  readonly target: TTarget;
}

export function openCommandStorage(
  context: CommandContext,
  request: CommandRequest,
): Promise<StorageSession | undefined> {
  const { storageRuntime } = context.services;
  return createStorageSession(getGlobalOptions(request.command), {
    interactive: request.interactive,
    output: context.output,
    ...(storageRuntime === undefined ? {} : { runtime: storageRuntime }),
  });
}

export async function resolveCommandTarget<TTarget>(
  context: CommandContext,
  request: RegisteredTargetRequest,
  resolveTarget: RegisteredTargetResolver<TTarget>,
): Promise<ResolvedTarget<TTarget> | undefined> {
  const { command, ...lookup } = request;
  const storage = await openCommandStorage(context, {
    command,
    interactive: lookup.interactive,
  });
  if (storage === undefined) {
    return undefined;
  }

  const target = await resolveTarget({
    ...lookup,
    registry: await storage.registry.read(),
  });
  return target === undefined ? undefined : { storage, target };
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, JSON_INDENTATION);
}

function getGlobalOptions(command: Command): StorageSelectors {
  return command.optsWithGlobals<StorageSelectors>();
}
