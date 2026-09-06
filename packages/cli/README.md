# skillslink

Generate self-contained document and divided-part URLs from local `.md` files. The command validates and reads the file locally, opens the viewer, and asks whether to save the complete link hierarchy in the user's JSON registry. It does not call a publishing API or use a GitHub token.

```bash
npx @vidigal-code/skillslink@latest generate file.md
npx @vidigal-code/skillslink@latest publish file.md
npx @vidigal-code/skillslink@latest list
npx @vidigal-code/skillslink@latest open file.md
npx @vidigal-code/skillslink@latest copy file.md
npx @vidigal-code/skillslink@latest download file.md --directory ./recovered
npx @vidigal-code/skillslink@latest prompt file.md
npx @vidigal-code/skillslink@latest remove file.md
```

Run `skillslink` without a subcommand to open the complete interactive command menu.

`publish` and `create` are aliases of `generate`; all three only create URLs. Only valid UTF-8 `.md` documents up to 64 KiB are accepted. The complete link contains the whole file. A shared CommonMark and GFM parser creates nested links for headings, paragraphs, fenced code, individual list items, quotes, tables, and other blocks. Parts above 1 KiB are split further at safe text boundaries. New links use compact bytes and zlib compression when it shortens the result. Their payload stays in a URL fragment and is not sent in the HTTP request, preventing this document data from causing an HTTP 431 response.

Base64URL is not encryption. Anyone with the complete generated URL can recover the document. The fragment is not sent to the configured host, but it can remain in browser history or be exposed when copied. Do not encode secrets.

Use `--save` to register without prompting, `--no-open` to keep the browser closed, and `--json` for non-interactive machine-readable output:

```bash
skillslink generate guide.md --save --no-open
skillslink generate guide.md --json
```

In an interactive terminal, the file argument can be omitted. The CLI then opens an `@clack/prompts` path selector and asks whether to register the generated links. Each parent record contains the complete URL, UUID, file name, media type, ISO creation date and time, and nested part records. Every part has a separately checked UUID, title, byte size, Markdown name, and complete URL.

`skillslink list` renders each parent followed by its nested part table and an English AI prompt containing the complete divided URLs. Long table values are abbreviated with `...`; `skillslink list --json` returns the complete hierarchy. Use `open` to launch a registered URL, `copy` to place it on the system clipboard, and `download` (alias `get`) to decode and save the selected Markdown file. These commands accept a parent or part UUID, URL, generated file name, or part title and show an interactive selector when the argument is omitted. Downloads prompt for a directory or accept `--directory <path>` and refuse to replace an existing file unless `--overwrite` is selected.

The default `list` mode is `divided`. Override one call with `--mode divided|complete|all`, or persist a default with `skillslink config --list-mode divided|complete|all`. The English prompt follows that selection, except that a complete URL above the 8000-character compatibility limit is always omitted in favor of its smaller parts.

`skillslink prompt <id-or-name>` prints the same English AI learning prompt. Add `--copy` to place it on the clipboard. The full value remains available in the JSON registry and `list --json`.

Only `.md` is a document input. Text files and every other extension are rejected.

The default registry is stored in the operating system's user-data directory. `skillslink where` prints its path. Select another file with `--store <file>` or `SKILLSLINK_STORE`.

Configure another static viewer with:

```bash
skillslink config --site-url https://example.github.io/skillslink/
```

Full documentation and source: [github.com/Vidigal-code/skillslink](https://github.com/Vidigal-code/skillslink).
