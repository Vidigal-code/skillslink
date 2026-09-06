# Changelog

All notable changes to SkillsLink are documented in this file. The project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09-06

### Added

- Self-contained, versioned Markdown links with Base64URL encoding and optional zlib compression.
- Semantic document splitting for headings, paragraphs, lists, code blocks, tables, quotes, and oversized Markdown blocks.
- Ordered English learning prompts that contain every divided link needed to reconstruct a document.
- An interactive CLI for generating, registering, listing, opening, copying, downloading, and removing links, including the `copy-prompt` command.
- Cross-platform first-run setup with separate `config.json` and `links.json` files, atomic writes, path overrides, and legacy registry migration.
- A statically exported Next.js viewer and generator with editable documents, English, Portuguese, and Spanish routes, responsive layouts, and persistent dark or light themes.
- Pre-rendered repository snapshots, raw Markdown routes, and an `llms.txt` index for clients that read content directly from HTTP responses.
- Automated GitHub Pages deployment and npm publication with trusted publishing and provenance.

### Changed

- `list` selects one registered document by UUID and prints only that document, its abbreviated complete URL, and its full English learning prompt.
- Portable v2 payloads choose compressed or raw bytes according to the shorter resulting URL while retaining v1 decoding compatibility.
- CLI configuration and registered document hierarchies are stored in separate JSON files.

### Fixed

- First-run path prompts accept their suggested values when the user presses Enter.
- Human output and learning prompts fall back to ordered divided links when the complete URL exceeds the compatibility limit.

### Security

- Source files are restricted to UTF-8 `.md` documents of at most 64 KiB.
- Portable payloads use URL fragments so embedded content is not sent in ordinary HTTP requests.
- Local configuration and link records use private file permissions where the operating system supports them.
- CLI generation and browser rendering require no GitHub token or document upload API.

[1.0.0]: https://github.com/Vidigal-code/skillslink/releases/tag/v1.0.0
