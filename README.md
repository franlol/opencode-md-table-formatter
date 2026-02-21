# @franlol/opencode-md-table-formatter

Markdown table formatter plugin for Opencode with concealment mode support.

## Usage

Add the plugin to your `.opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["@franlol/opencode-md-table-formatter@0.0.3"],
}
```

## Example

<table>
  <tr>
    <th style="text-align:center;">Original</th>
    <th style="text-align:center;">Formatted</th>
  </tr>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/df71e950-c15d-4a10-8e08-fdd9b0216ba0"
           alt="Screenshot 1"
           style="height:250px; object-fit:cover;">
    </td>
    <td>
      <img src="https://github.com/user-attachments/assets/c6f253e0-350f-487e-8da7-c8c6e8b2cb93"
           alt="Screenshot 2"
           style="height:250px; object-fit:cover;">
    </td>
  </tr>
</table>

## Configuration

Set the `OPENCODE_TABLE_STYLE` environment variable to choose a table style. If unset or invalid, defaults to `markdown`.

| Value         | Description                                |
|---------------|--------------------------------------------|
| `markdown`    | Standard markdown tables (default)         |
| `boxDrawing`  | Single-line box-drawing characters         |
| `doublePipe`  | Double-line box-drawing characters         |

**markdown** (default):

```
| Name   | Age | City     |
| ------ | --- | -------- |
| Alice  | 30  | New York |
| Bob    | 25  | London   |
```

**boxDrawing**:

```
┌────────┬─────┬──────────┐
│ Name   │ Age │ City     │
├────────┼─────┼──────────┤
│ Alice  │ 30  │ New York │
│ Bob    │ 25  │ London   │
└────────┴─────┴──────────┘
```

**doublePipe**:

```
╔════════╦═════╦══════════╗
║ Name   ║ Age ║ City     ║
╠════════╬═════╬══════════╣
║ Alice  ║ 30  ║ New York ║
║ Bob    ║ 25  ║ London   ║
╚════════╩═════╩══════════╝
```

## Features

- **Automatic table formatting** - Formats markdown tables after AI text completion
- **Concealment mode compatible** - Correctly calculates column widths when markdown symbols are hidden
- **Alignment support** - Left (`:---`), center (`:---:`), and right (`---:`) text alignment
- **Nested markdown handling** - Strips bold, italic, strikethrough with multi-pass algorithm
- **Code block preservation** - Preserves markdown symbols inside inline code (`` `**bold**` ``)
- **Edge case handling** - Emojis, unicode characters, empty cells, long content
- **Silent operation** - No console logs, errors don't interrupt workflow
- **Validation feedback** - Invalid tables get helpful error comments


**Key behaviors:**

- Bold/italic symbols outside code are hidden by concealment but width calculated correctly
- `**bold**` inside backticks shows as literal text with proper spacing
- Emojis and unicode characters align properly
- Columns have consistent spacing

## How It Works

This plugin uses Opencode's `experimental.text.complete` hook to format markdown tables after the AI finishes generating text. It intelligently strips markdown symbols (for width calculation) while preserving symbols inside inline code blocks, ensuring tables align correctly ONLY with Opencode's concealment mode enabled (the default setting).

The plugin uses a multi-pass regex algorithm to handle nested markdown (like `**bold with `code` inside**`) and caches width calculations for performance.

## Troubleshooting

**Tables not formatting?**

- Ensure the plugin is listed in your `.opencode/opencode.jsonc` config
- Restart Opencode after adding the plugin
- Check that tables have a separator row (`|---|---|`)


**Invalid table structure comment?**

- The plugin validates tables before formatting
- All rows must have the same number of columns
- Tables must have at least 2 rows including the separator

## Requirements

- Opencode >= 1.0.137

## License

MIT © franlol

## Links

- [GitHub Repository](https://github.com/franlol/opencode-md-table-formatter)
- [npm Package](https://www.npmjs.com/package/@franlol/opencode-md-table-formatter)
- [Report Issues](https://github.com/franlol/opencode-md-table-formatter/issues)
