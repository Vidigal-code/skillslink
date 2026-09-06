# Test seams

The behavior has these stable seams:

- `@skillslink/link-format`: supported names and media types validate, Unicode content survives a Base64URL round trip, and viewer/raw URLs preserve the GitHub Pages base path.
- `generateDocumentLink`: a valid local source becomes one complete URL plus bounded part URLs, and generated UUIDs are checked against existing parent and part IDs.
- `resolveDefaultStoragePaths`: injected home directories and `path.win32` or `path.posix` verify the exact `<home>/.skillslink/config.json`, `links.json`, and `active-config.json` paths without reading a developer machine.
- `JsonConfiguration` and `JsonConfigurationLocation`: persistent settings, the selected links file, and a custom configuration locator survive process restarts through strict versioned schemas.
- `JsonRegistry`: nested generated links persist independently in `links.json`, duplicate IDs are rejected, and link writes do not rewrite `config.json`. Combined registry schemas 1 and 2 remain readable for migration.
- initial CLI storage setup: mocked `@clack/prompts`, injected environment and home paths, and temporary directories verify default setup, custom-path rediscovery, cancellation without writes, and prompt-free non-interactive or JSON execution.
- registered-link commands: a saved parent or part can be found by UUID, URL, generated name, or title; displayed in nested compact tables; opened; copied; and recovered into an exact local file.
- static web output: every repository snapshot appears in pre-rendered HTML, its raw file preserves the exact UTF-8 source, and `llms.txt` indexes both routes.

Storage tests use injected environments and temporary home or legacy paths so `SKILLSLINK_CONFIG`, `SKILLSLINK_STORE`, `SKILLSLINK_SITE_URL`, a real `active-config.json`, or developer registry data cannot affect the cases under test. Temporary cleanup rejects paths outside the operating system's test directory.

The browser editor reuses the same validation, encoder, and URL creation functions as the CLI. Terminal presentation examples live in [`packages/cli/tests/README.md`](../packages/cli/tests/README.md); executable command tests verify their underlying output and filesystem behavior. Production export and HTTP artifact checks verify the web integration boundary.
