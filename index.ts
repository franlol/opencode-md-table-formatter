import type { Plugin, Hooks } from "@opencode-ai/plugin"

declare const Bun: any

type Alignment = "left" | "center" | "right"

type ParsedTable = {
  rows: string[][]
  colWidths: number[]
  colAlignments: Alignment[]
  separatorIndices: Set<number>
}

type TableStyle = {
  renderTable: (table: ParsedTable) => string[]
}

type TableStyleName = "markdown" | "boxDrawing" | "doublePipe"

type BorderChars = {
  topLeft: string; topRight: string; bottomLeft: string; bottomRight: string
  horizontal: string; vertical: string
  topTee: string; bottomTee: string; leftTee: string; rightTee: string; cross: string
}

// Width cache for performance optimization
const widthCache = new Map<string, number>()
let cacheOperationCount = 0

function createBorderedStyle(chars: BorderChars): TableStyle {
  function buildHorizontalLine(colWidths: number[], left: string, mid: string, right: string): string {
    const segments = colWidths.map((w) => chars.horizontal.repeat(w + 2))
    return left + segments.join(mid) + right
  }

  return {
    renderTable(table: ParsedTable): string[] {
      const { rows, colWidths, colAlignments, separatorIndices } = table
      const colCount = colWidths.length
      const result: string[] = []

      result.push(buildHorizontalLine(colWidths, chars.topLeft, chars.topTee, chars.topRight))

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        if (separatorIndices.has(rowIndex)) {
          result.push(buildHorizontalLine(colWidths, chars.leftTee, chars.cross, chars.rightTee))
        } else {
          const cells: string[] = []
          for (let col = 0; col < colCount; col++) {
            const cell = rows[rowIndex][col] ?? ""
            cells.push(padCell(cell, colWidths[col], colAlignments[col]))
          }
          result.push(chars.vertical + " " + cells.join(" " + chars.vertical + " ") + " " + chars.vertical)
        }
      }

      result.push(buildHorizontalLine(colWidths, chars.bottomLeft, chars.bottomTee, chars.bottomRight))
      return result
    },
  }
}

function formatSeparatorCell(width: number, align: Alignment): string {
  if (align === "center") return ":" + "-".repeat(Math.max(1, width - 2)) + ":"
  if (align === "right") return "-".repeat(Math.max(1, width - 1)) + ":"
  return "-".repeat(width)
}

const markdownStyle: TableStyle = {
  renderTable(table: ParsedTable): string[] {
    const { rows, colWidths, colAlignments, separatorIndices } = table
    const colCount = colWidths.length

    return rows.map((row, rowIndex) => {
      const cells: string[] = []
      for (let col = 0; col < colCount; col++) {
        const cell = row[col] ?? ""
        if (separatorIndices.has(rowIndex)) {
          cells.push(formatSeparatorCell(colWidths[col], colAlignments[col]))
        } else {
          cells.push(padCell(cell, colWidths[col], colAlignments[col]))
        }
      }
      return "| " + cells.join(" | ") + " |"
    })
  },
}

const TABLE_STYLES: Record<TableStyleName, TableStyle> = {
  markdown: markdownStyle,
  boxDrawing: createBorderedStyle({
    topLeft: "┌", topRight: "┐", bottomLeft: "└", bottomRight: "┘",
    horizontal: "─", vertical: "│",
    topTee: "┬", bottomTee: "┴", leftTee: "├", rightTee: "┤", cross: "┼",
  }),
  doublePipe: createBorderedStyle({
    topLeft: "╔", topRight: "╗", bottomLeft: "╚", bottomRight: "╝",
    horizontal: "═", vertical: "║",
    topTee: "╦", bottomTee: "╩", leftTee: "╠", rightTee: "╣", cross: "╬",
  }),
}

function resolveStyleName(): TableStyleName {
  const env = (typeof process !== "undefined" && process.env?.OPENCODE_TABLE_STYLE) || ""
  if (env in TABLE_STYLES) return env as TableStyleName
  return "markdown"
}

export const FormatTables: Plugin = async () => {
  const style = TABLE_STYLES[resolveStyleName()]

  return {
    "experimental.text.complete": async (
      input: { sessionID: string; messageID: string; partID: string },
      output: { text: string },
    ) => {
      try {
        output.text = formatMarkdownTables(output.text, style)
      } catch (error) {
        // If formatting fails, keep original md text
        output.text = output.text + "\n\n<!-- table formatting failed: " + (error as Error).message + " -->"
      }
    },
  } as Hooks
}

function formatMarkdownTables(text: string, style: TableStyle): string {
  const lines = text.split("\n")
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (isTableRow(line)) {
      const tableLines: string[] = [line]
      i++

      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i])
        i++
      }

      if (isValidTable(tableLines)) {
        result.push(...formatTable(tableLines, style))
      } else {
        result.push(...tableLines)
        result.push("<!-- table not formatted: invalid structure -->")
      }
    } else {
      result.push(line)
      i++
    }
  }

  incrementOperationCount()
  return result.join("\n")
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.split("|").length > 2
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false
  const cells = trimmed.split("|").slice(1, -1)
  return cells.length > 0 && cells.every((cell) => /^\s*:?-+:?\s*$/.test(cell))
}

function isValidTable(lines: string[]): boolean {
  if (lines.length < 2) return false

  const rows = lines.map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()),
  )

  if (rows.length === 0 || rows[0].length === 0) return false

  const firstRowCellCount = rows[0].length
  const allSameColumnCount = rows.every((row) => row.length === firstRowCellCount)
  if (!allSameColumnCount) return false

  const hasSeparator = lines.some((line) => isSeparatorRow(line))
  return hasSeparator
}

function parseTable(lines: string[]): ParsedTable {
  const separatorIndices = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    if (isSeparatorRow(lines[i])) separatorIndices.add(i)
  }

  const rows = lines.map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()),
  )

  const colCount = Math.max(...rows.map((row) => row.length))

  const colAlignments: Alignment[] = Array(colCount).fill("left")
  for (const rowIndex of separatorIndices) {
    const row = rows[rowIndex]
    for (let col = 0; col < row.length; col++) {
      colAlignments[col] = getAlignment(row[col])
    }
  }

  const colWidths: number[] = Array(colCount).fill(3)
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    if (separatorIndices.has(rowIndex)) continue
    const row = rows[rowIndex]
    for (let col = 0; col < row.length; col++) {
      const displayWidth = calculateDisplayWidth(row[col])
      colWidths[col] = Math.max(colWidths[col], displayWidth)
    }
  }

  return { rows, colWidths, colAlignments, separatorIndices }
}

function formatTable(lines: string[], style: TableStyle): string[] {
  const table = parseTable(lines)
  if (table.rows.length === 0) return lines
  return style.renderTable(table)
}

function getAlignment(delimiterCell: string): Alignment {
  const trimmed = delimiterCell.trim()
  const hasLeftColon = trimmed.startsWith(":")
  const hasRightColon = trimmed.endsWith(":")

  if (hasLeftColon && hasRightColon) return "center"
  if (hasRightColon) return "right"
  return "left"
}

function calculateDisplayWidth(text: string): number {
  if (widthCache.has(text)) {
    return widthCache.get(text)!
  }

  const width = getStringWidth(text)
  widthCache.set(text, width)
  return width
}

function getStringWidth(text: string): number {
  // Strip markdown symbols for concealment mode
  // Users with concealment ON don't see **, *, ~~, ` but DO see markdown inside `code`

  // CRITICAL: Content inside backticks should PRESERVE inner markdown symbols
  // because concealment treats them as literal text, not markdown

  // Step 1: Extract and protect inline code content
  const codeBlocks: string[] = []
  let textWithPlaceholders = text.replace(/`(.+?)`/g, (match, content) => {
    codeBlocks.push(content)
    return `\x00CODE${codeBlocks.length - 1}\x00`
  })

  // Step 2: Strip markdown from non-code parts
  let visualText = textWithPlaceholders
  let previousText = ""

  while (visualText !== previousText) {
    previousText = visualText
    visualText = visualText
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1") // ***bold+italic*** -> text
      .replace(/\*\*(.+?)\*\*/g, "$1") // **bold** -> bold
      .replace(/\*(.+?)\*/g, "$1") // *italic* -> italic
      .replace(/~~(.+?)~~/g, "$1") // ~~strike~~ -> strike
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1") // ![alt](url) -> alt (OpenTUI shows only alt text)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)") // [text](url) -> text (url)
  }

  // Step 3: Restore code content (with its original markdown preserved)
  visualText = visualText.replace(/\x00CODE(\d+)\x00/g, (match, index) => {
    return codeBlocks[parseInt(index)]
  })

  return Bun.stringWidth(visualText)
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
