import {
  formatJson,
  openCommandStorage,
  type ArgumentAction,
  type CommandContext,
} from "../command-context";
import {
  isInteractiveSession,
  resolveRegisteredDocument,
} from "../interactive";
import { formatLinkList, formatSelectedLink } from "../output";
import { parseListDisplayMode } from "./settings-commands";

export interface ListOptions {
  readonly json?: boolean;
  readonly mode?: string;
}

export function createListAction(
  context: CommandContext,
): ArgumentAction<ListOptions> {
  return async (identifier, options, command) => {
    const jsonOutput = options.json === true;
    const interactive = !jsonOutput && isInteractiveSession();
    const storage = await openCommandStorage(context, { command, interactive });
    if (storage === undefined) {
      return;
    }
    const registry = await storage.registry.read();
    const formatOptions = {
      mode: parseListDisplayMode(
        options.mode ?? registry.settings.listDisplayMode,
      ),
    };
    const shouldSelectOne =
      identifier !== undefined || (interactive && registry.links.length > 0);
    if (!shouldSelectOne) {
      context.output.write(
        jsonOutput
          ? formatJson(registry.links)
          : formatLinkList(registry.links, formatOptions),
      );
      return;
    }

    const selectedLink = await resolveRegisteredDocument({
      registry,
      identifier,
      action: "list",
      interactive,
    });
    if (selectedLink === undefined) {
      return;
    }
    context.output.write(
      jsonOutput
        ? formatJson([selectedLink])
        : formatSelectedLink(selectedLink, formatOptions),
    );
  };
}
