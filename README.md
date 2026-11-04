# @franlol/opencode-md-table-formatter

Markdown table alignment for OpenCode 2.

> **This is a prompt-level nudge, not a formatter.** OpenCode 1 post-processed
> finished assistant text through the `experimental.text.complete` hook. OpenCode
> 2 removed that hook and has no supported way to rewrite completed message text,
> so the plugin now injects a table-alignment instruction into every model
> request and the model produces the aligned table itself. Alignment therefore
> depends on the model following the instruction; this plugin does not guarantee
> byte-exact tables.

## Install

Add the plugin to the `plugins` key of your `opencode.json(c)`:

```jsonc
{
  "plugins": ["@franlol/opencode-md-table-formatter"]
}
```

A local checkout works too; point `plugins` at the directory:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-md-table-formatter"]
}
```

Two configuration details matter on OpenCode 2:

- The key is `plugins`. The V1 key `plugin` is ignored.
- An entry with options is an object, not a tuple. `["pkg", { ... }]` is dropped
  without an error; write `{ "package": "pkg", "options": { ... } }` instead.

## Entry point

`index.ts` stays at the repository root. When `plugins` names a directory,
OpenCode 2 resolves that entry by looking for `server` and then `index` with a
`.ts`, `.tsx`, or `.js` extension. It does not follow `package.json` `main` or
`exports` for a directory entry, so the root `index.ts` is the file the loader
picks. Published packages resolve `exports` (also `./index.ts`).

The module default-exports `Plugin.define({ id: "md-table-formatter", setup })`.
A named export alone fails to load with `Plugin must export a default definition
with an id and an effect or setup function.`

## What it does

During `setup`, the plugin registers one session `context` hook. Before each
model request, the hook appends this instruction to the system parts:

```
Format every markdown table you output with aligned columns:
- compute each column's display width across header, separator, and body rows
- pad every cell with spaces to that width, honoring alignment (:---, :--:, ---:)
- keep the separator row's dashes at the full column width
- escape literal pipes inside a cell as \| so they are not read as delimiters
- count wide characters (CJK, emoji) as two columns
```

Because it is a `context` hook, it applies to the agent loop, including
tool-driven continuations. It changes only the outgoing request, never persisted
history.

## The formatter is preserved

The alignment rules still live in code as an exported pure function,
`formatMarkdownTables(text)`, in `table-formatter.ts` and re-exported from
`index.ts`:

```ts
import { formatMarkdownTables } from "@franlol/opencode-md-table-formatter"

const aligned = formatMarkdownTables(markdown)
```

No OpenCode 2 hook calls it. It is kept because it is the only place where the
alignment rules are written down exactly and can be tested, and because a TUI
renderer could reuse it to align a table at render time. Its unit tests cover:

- alignment markers `:---` (left), `:--:` (center), `---:` (right)
- escaped pipes (`\|`) in header and body cells, which are preserved and are not
  counted as column delimiters
- wide (CJK) characters, measured as two columns
- concealment-mode widths: markdown symbols are hidden before measuring, while
  inline-code content keeps its literal characters
- ragged tables, which are left untouched and followed by
  `<!-- table not formatted: invalid structure -->`

Display width comes from `Bun.stringWidth`, the same primitive the TUI uses.
Widths are cached, with the cache cleared after 100 formatting operations or
when it grows past 1000 entries.

## Development

Requires [Bun](https://bun.sh) (OpenCode's runtime).

```sh
bun install
bun test        # unit tests over the pure formatter and the plugin definition
bun run typecheck
```

To check that OpenCode 2 loads the directory entry, point a config at this
directory and inspect the plugin list:

```sh
opencode api GET /api/plugin
```

`active` proves the entry loaded. It does not prove the model aligned anything.

## Differences from 0.x

- The plugin default-exports a `Plugin.define` definition instead of the V1
  `FormatTables` hook object.
- `experimental.text.complete` is gone; alignment is requested from the model.
- `@opencode-ai/plugin` is replaced by `@opencode/plugin` (OpenCode 2).
- The formatter moved to `table-formatter.ts` and is exported as a pure
  function, with tests.

## Known limitations

- No output-text rewrite exists in OpenCode 2, so tables are only as aligned as
  the model makes them.
- The formatter handles pipe tables only: no HTML tables, no multi-line cells,
  and no tables without a separator row.
- A table with rows of different column counts is reported, not repaired.

## License

MIT © franlol

## Links

- [GitHub Repository](https://github.com/franlol/opencode-md-table-formatter)
- [npm Package](https://www.npmjs.com/package/@franlol/opencode-md-table-formatter)
- [Report Issues](https://github.com/franlol/opencode-md-table-formatter/issues)
