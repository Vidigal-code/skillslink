import { spawn } from "node:child_process";

import { CliError } from "../domain/cli-error";

interface ClipboardCommand {
  readonly executable: string;
  readonly arguments: readonly string[];
}

const CLIPBOARD_COMMANDS: Readonly<
  Partial<Record<NodeJS.Platform, readonly ClipboardCommand[]>>
> = {
  win32: [{ executable: "clip.exe", arguments: [] }],
  darwin: [{ executable: "pbcopy", arguments: [] }],
  linux: [
    { executable: "wl-copy", arguments: [] },
    { executable: "xclip", arguments: ["-selection", "clipboard"] },
    { executable: "xsel", arguments: ["--clipboard", "--input"] },
  ],
};

export async function copyTextToClipboard(value: string): Promise<void> {
  const commands = CLIPBOARD_COMMANDS[process.platform] ?? [];

  for (const command of commands) {
    try {
      await runClipboardCommand(command, value);
      return;
    } catch {
      continue;
    }
  }

  throw new CliError(
    "CONFIGURATION_ERROR",
    "Could not access a system clipboard command.",
  );
}

async function runClipboardCommand(
  command: ClipboardCommand,
  value: string,
): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command.executable, command.arguments, {
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: true,
    });

    child.once("error", rejectPromise);
    child.once("close", (exitCode) => {
      if (exitCode === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(
          `${command.executable} exited with code ${String(exitCode)}.`,
        ),
      );
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(value, "utf8");
  });
}
