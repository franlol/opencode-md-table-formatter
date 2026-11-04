/**
 * Pure markdown table formatter.
 *
 * OpenCode 2 removed the `experimental.text.complete` hook, so nothing in the
 * plugin calls this module at runtime any more. It is kept as the executable
 * specification of the alignment rules the plugin documents, and a future TUI
 * renderer can reuse it.
 *
 * The module is pure: `formatMarkdownTables` maps a string to a string. Display
 * width comes from `Bun.stringWidth`, which is the runtime OpenCode itself
 * uses, so CJK and emoji columns are measured the same way the TUI measures
 * them.
 */

export type Alignment = "left" | "center" | "right"

/** A separator cell always needs room for `:` plus at least one `-`. */
const MIN_COLUMN_WIDTH = 3

declare const Bun: { stringWidth(input: string): number }

// Width cache for performance optimization
const widthCache = new Map<string, number>()
let cacheOperationCount = 0

/**
 * Re-align every contiguous markdown table in `text`.
 *
 * Tables whose rows do not all have the same column count, or that have no
 * separator row, are left untouched and followed by an explanatory comment.
 * Text outside tables is returned unchanged.
 */
export function formatMarkdownTables(text: string): string {
  const lines = text.split("\n")
  const result: string[] = []
  let i = 0
  let fence: string | undefined

  while (i < lines.length) {
    const fenceMarker = /^\s*(`{3,}|~{3,})/.exec(lines[i])

    if (fence !== undefined) {
      result.push(lines[i])
      if (
        fenceMarker !== null &&
        fenceMarker[1][0] === fence[0] &&
        fenceMarker[1].length >= fence.length
      ) {
        fence = undefined
      }
      i++
      continue
    }

    if (fenceMarker !== null) {
      fence = fenceMarker[1]
      result.push(lines[i])
      i++
      continue
    }

    if (!isTableRow(lines[i])) {
      result.push(lines[i])
      i++
      continue
    }

    const tableLines: string[] = []
    while (i < lines.length && isTableRow(lines[i])) {
      tableLines.push(lines[i])
      i++
    }

    if (isValidTable(tableLines)) {
      result.push(...formatTable(tableLines))
    } else {
      result.push(...tableLines)
      result.push("<!-- table not formatted: invalid structure -->")
    }
  }

  incrementOperationCount()
  return result.join("\n")
}

/**
 * Split a row into trimmed cells.
 *
 * A `|` preceded by an odd number of backslashes is cell content, not a
 * delimiter, so `| A \| B |` stays two cells. The escape is preserved in the
 * returned cell.
 */
function splitRow(line: string): string[] {
  const trimmed = line.trim()
  const inner = trimmed.slice(1, -1)
  const cells: string[] = []
  let current = ""
  let escaped = false

  for (const char of inner) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === "\\") {
      current += char
      escaped = true
      continue
    }
    if (char === "|") {
      cells.push(current)
      current = ""
      continue
    }
    current += char
  }
  cells.push(current)

  return cells.map((cell) => cell.trim())
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false
  // A row needs at least an opening and a closing delimiter; escaped pipes are
  // cell content and do not count.
  return countUnescapedPipes(trimmed) >= 2
}

function countUnescapedPipes(text: string): number {
  let count = 0
  let escaped = false

  for (const char of text) {
    if (escaped) {
      escaped = false
      continue
    }
    if (char === "\\") {
      escaped = true
      continue
    }
    if (char === "|") count++
  }

  return count
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false
  const cells = splitRow(line)
  return cells.length > 0 && cells.every((cell) => /^\s*:?-+:?\s*$/.test(cell))
}

function isValidTable(lines: string[]): boolean {
  if (lines.length < 2) return false

  const rows = lines.map(splitRow)
  if (rows.length === 0 || rows[0].length === 0) return false

  const firstRowCellCount = rows[0].length
  if (!rows.every((row) => row.length === firstRowCellCount)) return false

  return lines.some((line) => isSeparatorRow(line))
}

function formatTable(lines: string[]): string[] {
  const separatorIndices = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    if (isSeparatorRow(lines[i])) separatorIndices.add(i)
  }

  const rows = lines.map(splitRow)
  if (rows.length === 0) return lines

  const colCount = Math.max(...rows.map((row) => row.length))

  const colAlignments: Alignment[] = Array(colCount).fill("left")
  for (const rowIndex of separatorIndices) {
    const row = rows[rowIndex]
    for (let col = 0; col < row.length; col++) {
      colAlignments[col] = getAlignment(row[col])
    }
  }

  const colWidths: number[] = Array(colCount).fill(MIN_COLUMN_WIDTH)
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    if (separatorIndices.has(rowIndex)) continue
    const row = rows[rowIndex]
    for (let col = 0; col < row.length; col++) {
      colWidths[col] = Math.max(colWidths[col], calculateDisplayWidth(row[col]))
    }
  }

  return rows.map((row, rowIndex) => {
    const cells: string[] = []
    for (let col = 0; col < colCount; col++) {
      const cell = row[col] ?? ""
      const align = colAlignments[col]

      if (separatorIndices.has(rowIndex)) {
        cells.push(formatSeparatorCell(colWidths[col], align))
      } else {
        cells.push(padCell(cell, colWidths[col], align))
      }
    }
    return "| " + cells.join(" | ") + " |"
  })
}

export function getAlignment(delimiterCell: string): Alignment {
  const trimmed = delimiterCell.trim()
  const hasLeftColon = trimmed.startsWith(":")
  const hasRightColon = trimmed.endsWith(":")

  if (hasLeftColon && hasRightColon) return "center"
  if (hasRightColon) return "right"
  return "left"
}

export function calculateDisplayWidth(text: string): number {
  const cached = widthCache.get(text)
  if (cached !== undefined) return cached

  const width = Bun.stringWidth(toVisualText(text))
  widthCache.set(text, width)
  return width
}

/**
 * Turn source markdown into the text a concealment-mode renderer shows.
 *
 * Markdown symbols are hidden, code spans keep their literal content, and an
 * escaped `\|` counts as the single `|` it renders as.
 */
function toVisualText(text: string): string {
  const codeSpans: string[] = []
  const masked = text.replace(/`(.+?)`/g, (_match, content: string) => {
    codeSpans.push(content)
    return `\x00CODE${codeSpans.length - 1}\x00`
  })

  let visualText = masked
  let previousText = ""

  while (visualText !== previousText) {
    previousText = visualText
    visualText = visualText
      .replace(/\\\|/g, "|") // \| -> |, one rendered column
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1") // ***bold+italic*** -> text
      .replace(/\*\*(.+?)\*\*/g, "$1") // **bold** -> bold
      .replace(/\*(.+?)\*/g, "$1") // *italic* -> italic
      .replace(/~~(.+?)~~/g, "$1") // ~~strike~~ -> strike
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1") // ![alt](url) -> alt (OpenTUI shows only alt text)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)") // [text](url) -> text (url)
  }

  return visualText.replace(/\x00CODE(\d+)\x00/g, (_match, index: string) => {
    return codeSpans[parseInt(index, 10)]
  })
}

function padCell(text: string, width: number, align: Alignment): string {
  const displayWidth = calculateDisplayWidth(text)
  const totalPadding = Math.max(0, width - displayWidth)

  if (align === "center") {
    const leftPad = Math.floor(totalPadding / 2)
    const rightPad = totalPadding - leftPad
    return " ".repeat(leftPad) + text + " ".repeat(rightPad)
  } else if (align === "right") {
    return " ".repeat(totalPadding) + text
  } else {
    return text + " ".repeat(totalPadding)
  }
}

function formatSeparatorCell(width: number, align: Alignment): string {
  if (align === "center") return ":" + "-".repeat(Math.max(1, width - 2)) + ":"
  if (align === "right") return "-".repeat(Math.max(1, width - 1)) + ":"
  return "-".repeat(width)
}

function incrementOperationCount() {
  cacheOperationCount++

  if (cacheOperationCount > 100 || widthCache.size > 1000) {
    cleanupCache()
  }
}

function cleanupCache() {
  widthCache.clear()
  cacheOperationCount = 0
}
