# SkillsLink

SkillsLink turns UTF-8 Markdown files into self-contained URLs. The CLI reads the file locally, prints the complete document URL and compact divided-part URLs, opens the browser in an interactive terminal, and asks whether to register the links in a private `links.json` file. CLI settings and the selected link-store path live separately in `config.json`. It never calls a GitHub publishing API and never requests a GitHub token.

The repository also contains a statically exported Next.js viewer. It supports English, Portuguese, and Spanish; accepts only `.md` files; renders embedded documents; and lets the reader edit the name or content to create an updated URL.

## Requirements

- Node.js 22.14 or newer
- npm 10.9 or newer

## Generate a link

Run without installing:

```bash
npx @vidigal-code/skillslink@latest generate file.md
```

Run `skillslink` without a subcommand in an interactive terminal to open a menu for generating links, listing links, opening links, copying links, downloading documents, creating prompts, removing links, showing configuration, or showing the link-store path.

On the first interactive use without `--config`, `SKILLSLINK_CONFIG`, `--store`, or `SKILLSLINK_STORE`, SkillsLink asks where to create both storage files. It detects the current home directory and suggests these defaults:

| Platform | Configuration                    | Registered links                |
| -------- | -------------------------------- | ------------------------------- |
| Windows  | `<home>\.skillslink\config.json` | `<home>\.skillslink\links.json` |
| macOS    | `~/.skillslink/config.json`      | `~/.skillslink/links.json`      |
| Linux    | `~/.skillslink/config.json`      | `~/.skillslink/links.json`      |

The defaults for a Windows user named `Vidigal` resolve to `C:\Users\Vidigal\.skillslink\config.json` and `C:\Users\Vidigal\.skillslink\links.json`. Both prompts accept another absolute or relative `.json` path. When the selected configuration path differs from the default, the interactive setup saves its absolute location in `~/.skillslink/active-config.json` so later commands reuse it without prompting. Passing `--config` or `SKILLSLINK_CONFIG` for one invocation does not rewrite this locator.

The initial `config.json` enables complete and divided links and fixes generated learning prompts to English:

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

The separate `links.json` file contains only registered document hierarchies:

```json
{
  "kind": "skillslink-links",
  "schemaVersion": 1,
  "links": []
}
```

For a custom configuration path such as `/home/alex/project/skillslink-config.json`, the fixed locator contains:

```json
{
  "kind": "skillslink-config-location",
  "schemaVersion": 1,
  "configFile": "/home/alex/project/skillslink-config.json"
}
```

`--help`, `--version`, JSON output, and other non-interactive executions never start the setup prompts. Read-only commands can use in-memory defaults without creating files; the first state-changing command creates each required file with an atomic write.

`publish` is an alias for compatibility with the requested command shape. It performs the same local generation and does not publish anything:

```bash
npx @vidigal-code/skillslink@latest publish file.md
```

Install globally when you use the command often:

```bash
npm install --global @vidigal-code/skillslink
skillslink generate guide.md
```

In an interactive terminal, `generate` performs this sequence:

1. validates a UTF-8 `.md` file up to 64 KiB;
2. packs the name and content into a compact versioned payload, uses zlib when it makes the payload smaller, and encodes the result as Base64URL;
3. prints an English AI prompt first, followed by the abbreviated complete viewer URL when it is compatible and all divided-part URLs;
4. opens the complete URL when it is within the compatibility limit, otherwise opens the first divided link, and asks with `@clack/prompts` whether to register the complete record.

The file argument is optional in an interactive terminal. Running `skillslink generate` opens a path selector. A registered document stores its complete URL, UUID, file name, media type, ISO creation date and time, and nested part-link records. Every nested record has its own UUID, title, size, generated Markdown name, and complete URL. New UUIDs are checked against every saved document and part before registration.

Useful non-interactive options:

```bash
skillslink generate file.md --save --no-open
skillslink generate file.md --json
```

`--save` registers without asking. `--no-open` leaves the browser closed. `--json` prints machine-readable output and disables all interactive behavior.

## Manage the local link store

```bash
skillslink list
skillslink list --json
skillslink open guide.md
skillslink copy guide.md
skillslink download guide.md --directory ./recovered
skillslink prompt guide.md
skillslink remove guide.md
skillslink where
```

`list` prints each document as a parent row followed by a nested part table. Long URLs and UUIDs are abbreviated with `...`; `links.json` and `list --json` retain every complete value. `open`, `copy`, and `download` accept a document or part UUID, URL, generated file name, or part title. Without one, an interactive selector shows the complete hierarchy. `remove` deletes one parent document and all its nested part links. If more than one entry has the same case-insensitive name, the most recently created entry is selected.

`open` launches the exact saved URL in the default browser. `copy` writes it to the operating system clipboard. `download` decodes the selected URL and saves its `.md` content in the selected directory; use `--overwrite` to replace an existing file. `prompt` prints an English learning prompt with all recommended links, and `prompt --copy` copies it. Interactive commands ask for the saved item or destination when an argument is omitted.

Configuration and link-store writes are atomic and use mode `0600` on compatible systems. Select another configuration or link store for one invocation with an option or environment variable:

```bash
skillslink --config ./data/config.json list
skillslink --store ./data/links.json list
SKILLSLINK_CONFIG=./data/config.json skillslink list
SKILLSLINK_STORE=./data/links.json skillslink list
```

Paths are selected in this order:

1. `--config`, then `SKILLSLINK_CONFIG`, then `active-config.json`, then the default `config.json`;
2. `--store`, then `SKILLSLINK_STORE`, then `linksFile` from the selected configuration, then the default `links.json`.

For backward compatibility, when no configuration or locator exists and only `--store` or `SKILLSLINK_STORE` selects a link file, SkillsLink uses `config.json` beside that file. Once a configuration exists, the link-store selector applies only to the current invocation.

Saved configuration settings take precedence over embedded legacy settings, which take precedence over initial environment defaults and built-in defaults. `list --mode` overrides `listDisplayMode` for one invocation without changing `config.json`.

`skillslink where` prints the effective link-store path. `skillslink config` prints both effective paths and every persisted setting. Existing combined registry files with schema version 1 or 2 remain readable when selected. When no configuration, locator, override, or new default link store exists, SkillsLink also checks the former platform-specific default registry. Before a state-changing command converts a combined file in place, SkillsLink writes `config.json` first so the embedded settings are preserved.

Change the hosted viewer used in generated URLs:

```bash
skillslink config --site-url https://example.github.io/skillslink/
```

The matching environment variable, `SKILLSLINK_SITE_URL`, supplies the initial default when the selected configuration has not yet been created. A valid saved configuration takes precedence.

## Browser workflow

The `/upload/` page accepts only `.md`. File reading and URL generation happen entirely in the browser. Opening the generated URL renders the document. Select **Edit document**, change the file name or content, and select **Update URL**; the address and copy action then point to the new Base64URL payload. The accessible language selector preserves the current route, query string, and hash when switching among English, Portuguese, and Spanish. The color theme defaults to dark and stores a user's light or dark selection in the browser for later visits.

## Document size limit

SkillsLink rejects `.md` files larger than **64 KiB** before reading or encoding them. The same shared limit is enforced by the browser generator, editable viewer, CLI, and payload validator. Each generated part payload is limited to **1 KiB**. Base64URL increases the encoded length, and browsers and AI clients impose different URL limits, so focused links are preferable when a reader needs only one part.

Human-facing fields abbreviate URLs with `...` while copy and open actions retain the exact value. If the complete URL exceeds **8000 characters**, the browser and CLI human output show only the ordered part links. The complete value remains in `links.json` and machine-readable output. The ready-to-copy AI prompt follows the same rule.

Portable links store the encoded payload in `#document=...`. URL fragments stay in the browser and are not included in the HTTP request to GitHub Pages, preventing oversized document data from causing an HTTP 431 response. Legacy `?document=...` links remain readable for backward compatibility.

The Generate link page displays the limit before selection. If a user selects a larger file, generation is blocked immediately and the site shows a localized error in English, Portuguese, or Spanish.

## Automatic divided-part links

SkillsLink always creates a URL for the complete document. The v2 format removes redundant metadata and selects either compact raw bytes or maximum-level zlib compression, whichever produces the shorter URL. Version 1 links remain readable.

SkillsLink parses CommonMark and GitHub Flavored Markdown into semantic blocks. It creates ordered links for headings, paragraphs, fenced code blocks, individual list items, block quotes, tables, thematic breaks, definitions, and other top-level blocks. A block above 1 KiB is divided at paragraph, line, sentence, and finally Unicode character boundaries. The ordered parts reconstruct the complete source exactly.

For an AI skill or instruction file, use one `#` heading for the name and purpose. Give triggers, workflow, output, and examples focused `##` or `###` headings. Keep paragraphs, code blocks, and list items below 1 KiB when practical, and move large examples or references into another `.md` file. Short headings and file names also reduce URL overhead. Exclude generated logs, binary data, embedded Base64, credentials, and secrets.

## Prompt example for an AI

The web page and CLI create this English prompt automatically with every divided URL. Its structure is:

```text
Learn this skill by opening every SkillsLink page URL below in order:

1. <divided-url-1>
2. <divided-url-2>
3. <divided-url-3>

At each link, read the rendered Markdown part completely. Join the parts in numbered order to reconstruct one complete skill. Learn all instructions and constraints from the combined content. Then briefly state the skill's purpose, when it should be used, and the rules you must follow. Wait for my task after that.
```

Base64URL is encoding, not encryption. Anyone who receives the complete link can recover its document. The fragment is omitted from HTTP requests and therefore from ordinary proxy and hosting access logs, but it can remain in browser history or be exposed whenever the complete URL is copied or shared. Do not place secrets in a generated link.

The default language is English. Complete routes are exported for:

- `/en/`, `/pt/`, and `/es/`;
- each language's About, Generate link, Viewer, and repository-document pages.

Translation dictionaries are in [`apps/web/src/shared/i18n/langs`](./apps/web/src/shared/i18n/langs). The shared TypeScript contract and contribution instructions keep every page synchronized when a language is added.

## AI readability

SkillsLink provides two distinct forms:

- **Portable link:** `/view/#document=v2...` carries a compact, optionally compressed document in its URL fragment. The fragment stays in the browser, and the static viewer uses JavaScript to decode and render it. AI clients that execute the page can read this form.
- **Repository snapshot:** `/d/<id>/` contains the complete document in pre-rendered HTML, and `/raw/<id>.md` serves the exact source. `/llms.txt` indexes these routes for plain HTTP and AI readers. The `llms.txt` index is site infrastructure; `.txt` is never accepted as a source-document format.

The build verifies the formats this repository serves. No website can force an external AI service to enable browsing or JavaScript, allow GitHub Pages, or accept a long URL. Use a committed repository snapshot or its raw route when the reader needs content directly in the HTTP response.

The included example is generated from [`examples/ai-readable.md`](./examples/ai-readable.md) and stored under [`content`](./content).

## Architecture

```text
local .md
      |
      v
validation -> compact bytes -> optional zlib -> Base64URL
      |                            |
      |                            +-> /view/#document=v2... -> editable viewer
      +-> Markdown AST splitter -> focused payloads up to 1 KiB
      +-> config.json             -> settings and selected links file
      +-> links.json              -> nested document and part records

repository content/*.json
      |
      v
Next.js static export
      +-> /d/<id>/                 complete HTML
      +-> /raw/<id>.md             exact source
      +-> /llms.txt                machine-readable index
```

The npm workspace contains:

- `packages/link-format`: strongly typed document validation, codec, and URL functions;
- `packages/cli`: application use cases plus filesystem, registry, prompt, and browser adapters;
- `apps/web`: Next.js App Router, `next-yak`, and Feature-Sliced Design;
- `content`: reviewed repository snapshots for static HTTP reading.

Architecture decisions are recorded in [`docs/adr`](./docs/adr), and the stable test seams are described in [`docs/testing.md`](./docs/testing.md).

## Development

```bash
npm ci
npm run check
npm run pack:check
```

The [CLI command test guide](./packages/cli/tests/README.md) contains the automated command matrix and simulated terminal sessions for manual acceptance testing.

The web application uses `next-yak` `^9.7.0`, the Next.js App Router, static export, strict TypeScript, and Feature-Sliced Design import direction.

## Automated releases

Every push to `main` starts independent GitHub Actions workflows:

- `deploy-pages.yml` validates the project, exports the site, and deploys the artifact to GitHub Pages;
- `publish-npm.yml` validates and packs the CLI, assigns an immutable `0.<run>.<attempt>` version, and publishes with npm provenance through OIDC.

The npm package must have a Trusted Publisher configured for repository `Vidigal-code/skillslink` and workflow `publish-npm.yml`, with direct `npm publish` selected as an allowed action. After that one-time npm configuration, the workflow needs no long-lived npm token.

## License

MIT © Kauan Vidigal.
