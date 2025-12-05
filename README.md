# @franlol/opencode-mdtf

Markdown table formatter plugin for OpenCode with concealment mode support.

## Features

- ✅ **Automatic table formatting** - Formats markdown tables after AI text completion
- ✅ **Concealment mode compatible** - Correctly calculates column widths when markdown symbols are hidden
- ✅ **Alignment support** - Left (`:---`), center (`:---:`), and right (`---:`) text alignment
- ✅ **Nested markdown handling** - Strips bold, italic, strikethrough with multi-pass algorithm
- ✅ **Code block preservation** - Preserves markdown symbols inside inline code (`` `**bold**` ``)
- ✅ **Edge case handling** - Emojis, unicode characters, empty cells, long content
- ✅ **Silent operation** - No console logs, errors don't interrupt workflow
- ✅ **Validation feedback** - Invalid tables get helpful error comments

## Usage

Add the plugin to your `.opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["@franlol/opencode-mdtf"],
}
```

Restart OpenCode. Tables in AI responses will now be automatically formatted!

## Example

The plugin handles complex edge cases with concealment mode enabled:

**Input** (unformatted table with nested markdown):

```
| Feature | Description | Status |
|---|---|
| **Bold text** | Has *italic* content | ✅ Done |
| `Code` | With `**bold**` inside | ⏳ Progress |
| Unicode | Greek α β γ | 💡 Idea |
```

**Output** (automatically formatted):

```
| Feature       | Description            | Status      |
| ------------- | ---------------------- | ----------- |
| **Bold text** | Has *italic* content   | ✅ Done     |
| `Code`        | With `**bold**` inside | ⏳ Progress |
| Unicode       | Greek α β γ            | 💡 Idea     |
```

**Key behaviors:**

- Bold/italic symbols outside code are hidden by concealment but width calculated correctly
- `**bold**` inside backticks shows as literal text with proper spacing
- Emojis and unicode characters align properly
- Columns have consistent spacing

## How It Works

This plugin uses OpenCode's `text.complete` hook to format markdown tables after the AI finishes generating text. It intelligently strips markdown symbols (for width calculation) while preserving symbols inside inline code blocks, ensuring tables align correctly even with OpenCode's concealment mode enabled (the default setting).

The plugin uses a multi-pass regex algorithm to handle nested markdown (like `**bold with `code` inside**`) and caches width calculations for performance.

## Troubleshooting

**Tables not formatting?**

- Ensure the plugin is listed in your `.opencode/opencode.jsonc` config
- Restart OpenCode after adding the plugin
- Check that tables have a separator row (`|---|---|`)

**Excessive spacing in columns?**

- This is fixed in v0.1.0! The plugin now preserves markdown inside inline code correctly.

**Invalid table structure comment?**

- The plugin validates tables before formatting
- All rows must have the same number of columns
- Tables must have at least 2 rows including the separator

## Requirements

- OpenCode CLI
- Node.js >= 18.0.0 or Bun runtime
- `@opencode-ai/plugin` >= 0.13.7

## License

MIT © franlol

## Links

- [GitHub Repository](https://github.com/franlol/opencode-mdtf)
- [npm Package](https://www.npmjs.com/package/@franlol/opencode-mdtf)
- [Report Issues](https://github.com/franlol/opencode-mdtf/issues)
