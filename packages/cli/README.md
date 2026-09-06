# skillslink

Generate self-contained complete-document and divided-part URLs from local `.md` files. The command reads files locally, opens the viewer when appropriate, and can save the complete link hierarchy in a private `links.json` file. CLI settings and the selected link-store path live separately in `config.json`. SkillsLink does not call a publishing API or use a GitHub token.

```bash
npx @vidigal-code/skillslink@latest generate file.md
npx @vidigal-code/skillslink@latest publish file.md
npx @vidigal-code/skillslink@latest list
npx @vidigal-code/skillslink@latest list <id-or-name>
npx @vidigal-code/skillslink@latest open file.md
npx @vidigal-code/skillslink@latest copy file.md
npx @vidigal-code/skillslink@latest download file.md --directory ./recovered
npx @vidigal-code/skillslink@latest prompt file.md
npx @vidigal-code/skillslink@latest copy-prompt
npx @vidigal-code/skillslink@latest remove file.md
```

Run `skillslink` without a subcommand to open the complete interactive command menu.

## First-run storage

On the first interactive use without `--config`, `SKILLSLINK_CONFIG`, `--store`, or `SKILLSLINK_STORE`, SkillsLink asks where to create its configuration and link-store files. It uses the current home directory and offers the same `.skillslink` layout on every operating system:

| Platform | Configuration file               | Link store                      |
| -------- | -------------------------------- | ------------------------------- |
| Windows  | `<home>\.skillslink\config.json` | `<home>\.skillslink\links.json` |
| macOS    | `~/.skillslink/config.json`      | `~/.skillslink/links.json`      |
| Linux    | `~/.skillslink/config.json`      | `~/.skillslink/links.json`      |

For example, the Windows defaults can resolve to `C:\Users\Alex\.skillslink\config.json` and `C:\Users\Alex\.skillslink\links.json`. The initial configuration is:

```json
{
  "kind": "skillslink-config",
  "schemaVersion": 1,
  "linksFile": "/home/alex/.skillslink/links.json",
  "settings": {
    "siteUrl": "https://vidigal-code.github.io/skillslink/",
    "listDisplayMode": "divided",
    "completeLinks": true,
    "dividedLinks": true,
    "promptLanguage": "en"
  }
}
```

The independent link store starts as:

```json
{
  "kind": "skillslink-links",
  "schemaVersion": 1,
  "links": []
}
```

If the selected configuration path differs from the default, the interactive setup records it in `~/.skillslink/active-config.json`. Passing `--config` or `SKILLSLINK_CONFIG` for one invocation does not rewrite this locator:

```json
{
  "kind": "skillslink-config-location",
  "schemaVersion": 1,
  "configFile": "/home/alex/project/skillslink-config.json"
}
```

The locator lets later commands find the custom configuration without prompting. Help, version, JSON-output, and non-interactive invocations never start the setup wizard. Outside the interactive setup, read-only commands do not create storage files when they are absent.

Select files for one invocation with options or environment variables:

```bash
skillslink --config ./data/config.json --store ./data/links.json list
SKILLSLINK_CONFIG=./data/config.json SKILLSLINK_STORE=./data/links.json skillslink list
```

Resolution order is:

1. Configuration: `--config`, `SKILLSLINK_CONFIG`, `active-config.json`, default `config.json`.
2. Links: `--store`, `SKILLSLINK_STORE`, `linksFile` in the selected configuration, default `links.json`.
3. Settings: saved configuration, settings embedded in a legacy combined registry when no split configuration exists, initial environment defaults, built-in defaults. `list --mode` overrides `listDisplayMode` for one invocation.

For backward compatibility, when no configuration or locator exists and only `--store` or `SKILLSLINK_STORE` selects a link file, SkillsLink uses `config.json` beside that file. Once a configuration exists, the link-store selector applies only to the current invocation.

`skillslink where` prints the effective link-store path. `skillslink config` prints the configuration path, link-store path, and persisted settings. Existing combined registry files with schema version 1 or 2 remain readable and are converted when a state-changing command writes them. When no configuration, locator, override, or new default link store exists, SkillsLink checks the former platform-specific default registry.

## Generate and manage links

`publish` and `create` are aliases of `generate`; all three only create URLs. Only valid UTF-8 `.md` documents up to 64 KiB are accepted. The complete link contains the whole file. A shared CommonMark and GFM parser creates nested links for headings, paragraphs, fenced code, individual list items, quotes, tables, and other blocks. Parts above 1 KiB are split further at safe text boundaries. New links use compact bytes and zlib compression when it shortens the result. Their payload stays in a URL fragment and is not sent in the HTTP request, preventing this document data from causing an HTTP 431 response.

Base64URL is not encryption. Anyone with the complete generated URL can recover the document. The fragment is not sent to the configured host, but it can remain in browser history or be exposed when copied. Do not encode secrets.

Use `--save` to register without prompting, `--no-open` to keep the browser closed, and `--json` for non-interactive machine-readable output:

```bash
skillslink generate guide.md --save --no-open
skillslink generate guide.md --json
```

In an interactive terminal, the file argument can be omitted. The CLI then opens an `@clack/prompts` path selector and asks whether to register the generated links. Each parent record contains the complete URL, UUID, file name, media type, ISO creation date and time, and nested part records. Every part has a separately checked UUID, title, byte size, Markdown name, and complete URL.

In an interactive terminal, `skillslink list` asks for one parent document by its full UUID. It prints only the selected document's metadata, abbreviated complete URL, and English AI learning prompt; the full prompt URLs are not repeated in a part table. `skillslink list <id-or-name>` selects directly. `skillslink list --json` remains prompt-free and returns every complete hierarchy, while adding an identifier returns a one-document array.

Use `open` to launch a registered URL, `copy` to place it on the system clipboard, and `download` (alias `get`) to decode and save the selected Markdown file. These commands accept a parent or part UUID, URL, generated file name, or part title and show an interactive selector when the argument is omitted. Downloads accept `--directory <path>` or prompt for a directory in an interactive terminal. In non-interactive mode, an existing destination is rejected unless `--overwrite` is selected; in interactive mode, the CLI can ask for confirmation before replacing it.

The default `list` mode is `divided`. Override one call with `--mode divided|complete|all`, or persist a default with `skillslink config --list-mode divided|complete|all`. The `completeLinks` and `dividedLinks` capability settings both default to `true`, and `promptLanguage` is `en`. The English prompt follows the selected list mode, except that a complete URL above the 8000-character compatibility limit is always omitted in favor of its smaller parts.

`skillslink prompt <id-or-name>` prints the same English AI learning prompt. `skillslink copy-prompt [id-or-name]` copies only the divided-link prompt with all of its English instructions; when the identifier is omitted, it opens the document UUID selector. `prompt --copy` remains an equivalent shortcut. The full saved records remain available in `links.json` and `list --json`.

Only `.md` is a document input. Text files and every other extension are rejected.

Configure another static viewer with:

```bash
skillslink config --site-url https://example.github.io/skillslink/
```

Full documentation and source: [github.com/Vidigal-code/skillslink](https://github.com/Vidigal-code/skillslink).
