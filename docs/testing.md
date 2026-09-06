# Test seams

The behavior has four stable seams:

- `@skillslink/link-format`: supported names and media types validate, Unicode content survives a Base64URL round trip, and viewer/raw URLs preserve the GitHub Pages base path.
- `generateDocumentLink`: a valid local source becomes one complete URL plus bounded part URLs, and generated UUIDs are checked against existing parent and part IDs.
- `JsonRegistry`: settings and nested generated links survive process restarts through one selected JSON file, duplicate IDs are rejected, and writes remain atomic.
- registered-link commands: a saved parent or part can be found by UUID, URL, generated name, or title; displayed in nested compact tables; opened; copied; and recovered into an exact local file.
- static web output: every repository snapshot appears in pre-rendered HTML, its raw file preserves the exact UTF-8 source, and `llms.txt` indexes both routes.

The browser editor reuses the same validation, encoder, and URL creation functions as the CLI. Presentation details stay outside unit tests; production export and HTTP artifact checks verify the integration boundary.
