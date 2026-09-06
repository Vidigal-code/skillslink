#!/usr/bin/env node

import { CliError } from "./domain/cli-error";
import { createProgram } from "./presentation/create-program";
import { standardOutput } from "./presentation/output";

try {
  await createProgram().parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown failure.";
  standardOutput.writeError(
    error instanceof CliError
      ? `Error: ${message}`
      : `Unexpected error: ${message}`,
  );
  process.exitCode = 1;
}
