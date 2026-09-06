import { spawn } from "node:child_process";

import { CliError } from "../domain/cli-error";

interface OpenCommand {
  readonly executable: string;
  readonly arguments: readonly string[];
}

export async function openUrlInDefaultBrowser(url: string): Promise<void> {
  const command = createOpenCommand(process.platform, url);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.executable, command.arguments, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    child.once("error", (error) => {
      reject(
        new CliError(
          "CONFIGURATION_ERROR",
          "Could not open the generated URL in the default browser.",
          { cause: error },
        ),
      );
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function createOpenCommand(
  platform: NodeJS.Platform,
  url: string,
): OpenCommand {
  if (platform === "win32") {
    return {
      executable: "rundll32.exe",
      arguments: ["url.dll,FileProtocolHandler", url],
    };
  }

  if (platform === "darwin") {
    return { executable: "open", arguments: [url] };
  }

  return { executable: "xdg-open", arguments: [url] };
}
