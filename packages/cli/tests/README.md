# CLI terminal simulations

These examples document the observable CLI contract for manual acceptance testing. They use this `guide.md` fixture:

```md
# Install

Run `npm install`.
```

The examples assume the command runs from `/home/alex/project`. Deterministic command examples select `/home/alex/project/test-data/config.json` with `--config` and `/home/alex/project/test-data/links.json` with `--store`. UUIDs and timestamps are representative fixed values. The `...` suffixes in the complete-URL and table cells are emitted by SkillsLink; URLs inside learning prompts are printed in full.

## First interactive setup

Without explicit storage selectors, the first interactive command asks for both files before continuing. Accepting both suggestions produces this transcript on Linux:

```console
$ skillslink where
? Where should SkillsLink save config.json? /home/alex/.skillslink/config.json
? Where should SkillsLink save links.json? /home/alex/.skillslink/links.json
Configuration saved: /home/alex/.skillslink/config.json
Link store ready: /home/alex/.skillslink/links.json
/home/alex/.skillslink/links.json
```

Prompt glyphs and highlighting depend on terminal capabilities. The same home-relative layout is used on every supported platform:

| Platform | Configuration file               | Link store                      |
| -------- | -------------------------------- | ------------------------------- |
| Windows  | `<home>\.skillslink\config.json` | `<home>\.skillslink\links.json` |
| macOS    | `~/.skillslink/config.json`      | `~/.skillslink/links.json`      |
| Linux    | `~/.skillslink/config.json`      | `~/.skillslink/links.json`      |

The created `config.json` contains the link-store path and all persistent settings:

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

The created `links.json` contains only registered link records:

```json
{
  "kind": "skillslink-links",
  "schemaVersion": 1,
  "links": []
}
```

Choosing `/home/alex/project/skillslink-config.json` instead of the default configuration creates `~/.skillslink/active-config.json`. Passing `--config` or `SKILLSLINK_CONFIG` for one invocation does not rewrite this locator:

```json
{
  "kind": "skillslink-config-location",
  "schemaVersion": 1,
  "configFile": "/home/alex/project/skillslink-config.json"
}
```

The fixed locator makes the custom configuration discoverable on later invocations. Canceling either setup prompt creates none of these files. Non-interactive commands and `--json` modes never display setup prompts.

## Generate

`generate` accepts only UTF-8 `.md` files. `--save` registers the result without asking, and `--no-open` prevents a browser launch.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json generate ./guide.md --save --no-open
AI PROMPT (DIVIDED LINKS)
Learn this skill by opening every SkillsLink page URL below in order:

1. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAEgAFcDEubWQjIEluc3RhbGwKCg
2. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAGgAFcDIubWRSdW4gYG5wbSBpbnN0YWxsYC4K

At each link, read the rendered Markdown part completely. Join the parts in numbered order to reconstruct one complete skill. Learn all instructions and constraints from the combined content. Then briefly state the skill's purpose, when it should be used, and the rules you must follow. Wait for my task after that.

Generated from: guide.md
ID: 5853516a-bba8-4a9b-9b3f-4edd317f0e85
Created: 2026-09-06T10:19:12Z
Complete URL: https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAKAAIZ3VpZGUubWQjIEluc3RhbGwKC...
Divided links: 2
  PARTS (2)
  PART ID            | TITLE                    | BYTES    | LINK
  -------------------+--------------------------+----------+-------------------------------------------
  61f00a5f-faf4-4... | Install                  | 11       | https://vidigal-code.github.io/skillsli...
  39df523d-ff62-4... | Run npm install .        | 19       | https://vidigal-code.github.io/skillsli...
Registered in /home/alex/project/test-data/links.json
```

Without `--save`, an interactive terminal asks whether to register the generated hierarchy. Unless `--no-open` is present, an interactive terminal opens the complete URL when it is within the compatibility limit; otherwise, it opens the first divided link. `--json` prints the complete generated record and disables all interactive behavior. `publish` and `create` are aliases of `generate`; they generate local URLs and do not publish the file.

## List: default divided-link view

The persisted default is `divided`. The parent row keeps an abbreviated complete URL, the nested table shows every divided link, and the English prompt contains the complete divided URLs.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json list
ID                 | FILE                     | CREATED (UTC)        | LINK
-------------------+--------------------------+----------------------+-------------------------------------------
5853516a-bba8-4... | guide.md                 | 2026-09-06T10:19:12Z | https://vidigal-code.github.io/skillsli...
  PARTS (2)
  PART ID            | TITLE                    | BYTES    | LINK
  -------------------+--------------------------+----------+-------------------------------------------
  61f00a5f-faf4-4... | Install                  | 11       | https://vidigal-code.github.io/skillsli...
  39df523d-ff62-4... | Run npm install .        | 19       | https://vidigal-code.github.io/skillsli...
  AI PROMPT (DIVIDED)
  Learn this skill by opening every SkillsLink page URL below in order:

  1. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAEgAFcDEubWQjIEluc3RhbGwKCg
  2. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAGgAFcDIubWRSdW4gYG5wbSBpbnN0YWxsYC4K

  At each link, read the rendered Markdown part completely. Join the parts in numbered order to reconstruct one complete skill. Learn all instructions and constraints from the combined content. Then briefly state the skill's purpose, when it should be used, and the rules you must follow. Wait for my task after that.
```

`ls` is an alias of `list`. An empty link store prints `No URLs are registered.`

## List: one-time alternative views

`--mode complete` omits the part table for a compatible complete URL and puts only that complete URL in the prompt.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json list --mode complete
ID                 | FILE                     | CREATED (UTC)        | LINK
-------------------+--------------------------+----------------------+-------------------------------------------
5853516a-bba8-4... | guide.md                 | 2026-09-06T10:19:12Z | https://vidigal-code.github.io/skillsli...
  AI PROMPT (COMPLETE)
  Learn this skill by opening every SkillsLink page URL below in order:

  1. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAKAAIZ3VpZGUubWQjIEluc3RhbGwKClJ1biBgbnBtIGluc3RhbGxgLgo

  At each link, read the rendered Markdown part completely. Join the parts in numbered order to reconstruct one complete skill. Learn all instructions and constraints from the combined content. Then briefly state the skill's purpose, when it should be used, and the rules you must follow. Wait for my task after that.
```

`--mode all` keeps the part table and puts the complete URL before every divided URL in the prompt.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json list --mode all
ID                 | FILE                     | CREATED (UTC)        | LINK
-------------------+--------------------------+----------------------+-------------------------------------------
5853516a-bba8-4... | guide.md                 | 2026-09-06T10:19:12Z | https://vidigal-code.github.io/skillsli...
  PARTS (2)
  PART ID            | TITLE                    | BYTES    | LINK
  -------------------+--------------------------+----------+-------------------------------------------
  61f00a5f-faf4-4... | Install                  | 11       | https://vidigal-code.github.io/skillsli...
  39df523d-ff62-4... | Run npm install .        | 19       | https://vidigal-code.github.io/skillsli...
  AI PROMPT (ALL)
  Learn this skill by opening every SkillsLink page URL below in order:

  1. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAKAAIZ3VpZGUubWQjIEluc3RhbGwKClJ1biBgbnBtIGluc3RhbGxgLgo
  2. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAEgAFcDEubWQjIEluc3RhbGwKCg
  3. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAGgAFcDIubWRSdW4gYG5wbSBpbnN0YWxsYC4K

  At each link, read the rendered Markdown part completely. Join the parts in numbered order to reconstruct one complete skill. Learn all instructions and constraints from the combined content. Then briefly state the skill's purpose, when it should be used, and the rules you must follow. Wait for my task after that.
```

For a complete URL longer than 8000 characters, every human-readable mode falls back to the divided links and the parent table displays `DIVIDED LINKS ONLY`. `list --json` is the machine-readable alternative and prints an array containing the complete document and part records without display abbreviation.

## Open

`open` resolves a registered document or part by UUID, exact URL, generated file name, or part title and launches its URL in the default browser.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json open guide.md
Opened: guide.md (5853516a-bba8-4a9b-9b3f-4edd317f0e85)
```

When the identifier is omitted in an interactive terminal, SkillsLink displays a document-and-part selector.

## Copy

`copy` uses the same document-or-part lookup as `open` and writes the complete saved URL to the system clipboard.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json copy guide.md
Copied: guide.md (5853516a-bba8-4a9b-9b3f-4edd317f0e85)
```

## Download

`download` decodes the selected registered URL and writes its Markdown document to the chosen directory. It creates a missing destination directory.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json download guide.md --directory ./recovered
Saved: /home/alex/project/recovered/guide.md
```

In non-interactive mode, the command refuses to replace an existing file unless `--overwrite` is present. In an interactive terminal it can ask for the destination and, when needed, whether to replace the file. `get` is an alias of `download`.

## Prompt

`prompt` accepts a parent document UUID, exact complete URL, or file name and prints the English learning prompt.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json prompt guide.md
Learn this skill by opening every SkillsLink page URL below in order:

1. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAEgAFcDEubWQjIEluc3RhbGwKCg
2. https://vidigal-code.github.io/skillslink/view/#document=v2.AAAAGgAFcDIubWRSdW4gYG5wbSBpbnN0YWxsYC4K

At each link, read the rendered Markdown part completely. Join the parts in numbered order to reconstruct one complete skill. Learn all instructions and constraints from the combined content. Then briefly state the skill's purpose, when it should be used, and the rules you must follow. Wait for my task after that.
```

`--copy` copies that prompt instead of printing it:

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json prompt guide.md --copy
AI prompt copied: guide.md (5853516a-bba8-4a9b-9b3f-4edd317f0e85)
```

## Remove

`remove` deletes the parent record and all nested part records. `--yes` bypasses the interactive confirmation.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json remove guide.md --yes
Removed: 5853516a-bba8-4a9b-9b3f-4edd317f0e85 (guide.md)
```

The command accepts a parent document UUID, exact complete URL, or file name. `rm` is an alias of `remove`.

## Configuration

With no update options, `config` prints the selected configuration file, effective link store, and persistent settings.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json config
{
  "config": "/home/alex/project/test-data/config.json",
  "store": "/home/alex/project/test-data/links.json",
  "settings": {
    "siteUrl": "https://vidigal-code.github.io/skillslink/",
    "listDisplayMode": "divided",
    "completeLinks": true,
    "dividedLinks": true,
    "promptLanguage": "en"
  }
}
```

Both mutable settings can be updated together. Site URLs are normalized with a trailing slash.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json config --site-url https://docs.example.com/skillslink --list-mode all
{
  "config": "/home/alex/project/test-data/config.json",
  "store": "/home/alex/project/test-data/links.json",
  "settings": {
    "siteUrl": "https://docs.example.com/skillslink/",
    "listDisplayMode": "all",
    "completeLinks": true,
    "dividedLinks": true,
    "promptLanguage": "en"
  }
}
```

Valid list modes are `divided`, `complete`, and `all`. `--mode` on `list` overrides the stored mode for one call. The complete-link and divided-link capability fields remain enabled, and learning prompts remain English.

Storage selection follows these precedence rules:

1. Configuration: `--config`, `SKILLSLINK_CONFIG`, `active-config.json`, default `config.json`.
2. Links: `--store`, `SKILLSLINK_STORE`, the configuration's `linksFile`, default `links.json`.
3. Settings: saved configuration, settings embedded in a legacy combined registry when no split configuration exists, initial environment defaults, built-in defaults. `list --mode` overrides `listDisplayMode` for one invocation.

For backward compatibility, when no configuration or locator exists and only `--store` or `SKILLSLINK_STORE` selects a link file, SkillsLink uses `config.json` beside that file. Once a configuration exists, the link-store selector applies only to the current invocation.

Existing combined registry files with schema version 1 or 2 remain readable. When no configuration, locator, override, or new default link store exists, SkillsLink checks the former platform-specific default registry. A state-changing command initializes `config.json` before converting the selected combined file to the links-only schema, preserving its settings.

## Link-store path

`where` prints the effective `links.json` path.

```console
$ skillslink --config ./test-data/config.json --store ./test-data/links.json where
/home/alex/project/test-data/links.json
```

## Help and version

The top-level help lists every primary command and visible alias:

```console
$ skillslink --help
Usage: skillslink [options] [command]

Read Markdown files and turn them into self-contained URLs.

Options:
  -V, --version                        output the version number
  -c, --config <file>                  path to the CLI configuration file
  -s, --store <file>                   path to the links.json link store
  -h, --help                           display help for command

Commands:
  generate|publish [options] [file]    read a .md file and generate its URL
  list|ls [options]                    show registered links as a compact table
  open [id-or-name]                    open a registered link by ID or file name
  copy [id-or-name]                    copy a registered link by ID or file name
  download|get [options] [id-or-name]  recover a registered document into a
                                       selected directory
  prompt [options] [id-or-name]        print an English AI learning prompt with
                                       registered links
  remove|rm [options] [id-or-name]     remove a registered link by ID or file
                                       name
  config [options]                     read or update persistent configuration
  where                                show the path to the links.json link store
```

Every command also accepts `--help`, for example `skillslink list --help`. The version comes from the installed package metadata; this example reflects version `0.1.0`:

```console
$ skillslink --version
0.1.0
```

## Interactive entry point

After initial storage setup, running `skillslink` without a subcommand in a TTY opens an `@clack/prompts` selector with these actions:

```console
$ skillslink
What would you like to do?
  Generate a document link
  List registered links
  Open a registered link
  Copy a registered link
  Download a registered document
  Create an AI learning prompt
  Remove a registered link
  Show configuration
  Show link-store path
```

In a non-interactive session, the same invocation prints top-level help instead.
