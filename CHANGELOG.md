# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-03

### Changed
- Ported to OpenCode 2 plugin API (`Plugin.define` + `ctx.session.hook("context")`).
- Output-text rewrite replaced by request-side formatting instruction (v2 has no `experimental.text.complete`).
- peerDependency: `@opencode/plugin` ^2.2.0.


## [0.1.0] - 2025-01-07

### Added

- Initial release of markdown table formatter plugin for OpenCode
- Automatic table formatting via `text.complete` hook
- Concealment mode support (calculates width with markdown symbols hidden)
- Nested markdown handling with multi-pass stripping algorithm
- Code block preservation (markdown symbols inside `` `code` `` remain literal)
- Text alignment support: left (`:---`), center (`:---:`), right (`---:`)
- Width caching for performance optimization
- Invalid table validation with error comments
- Support for emojis, unicode characters, empty cells, long content
- Silent error handling (doesn't interrupt workflow)

### Technical Details

- 230 lines of production-ready TypeScript
- 12 functions with clear separation of concerns
- Type-safe with proper `Hooks` interface usage
- Smart cache cleanup (triggers at 100 ops OR 1000 entries)
- Multi-pass regex for arbitrary nesting depth

### Known Limitations

- Does not support HTML tables (only markdown pipe tables)
- Does not support multi-line cells (cells with `<br>` tags)
- Does not support tables without separator rows
- Requires `@opencode-ai/plugin` >= 0.13.7 (uses unpublished `text.complete` hook)

## Future Enhancements

- Configuration options (min/max column width, disable features)
- Support for tables without headers
- Performance profiling for very large tables (100+ rows)
- Additional alignment options
