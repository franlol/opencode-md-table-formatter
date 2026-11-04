import { describe, expect, test } from "bun:test"
import { formatMarkdownTables } from "./table-formatter.ts"

describe("alignment markers", () => {
  test("pads columns to the widest cell and honours :---, :--:, ---:", () => {
    const input = [
      "| Name | Qty | Price |",
      "| :--- | :--: | ---: |",
      "| Apple | 1 | 1.5 |",
      "| Banana | 22 | 10 |",
    ].join("\n")

    expect(formatMarkdownTables(input)).toBe(
      [
        "| Name   | Qty | Price |",
        "| ------ | :-: | ----: |",
        "| Apple  |  1  |   1.5 |",
        "| Banana | 22  |    10 |",
      ].join("\n"),
    )
  })

  test("keeps the minimum column width of three characters", () => {
    const input = ["| a | b |", "| --- | --- |"].join("\n")

    expect(formatMarkdownTables(input)).toBe(["| a   | b   |", "| --- | --- |"].join("\n"))
  })

  test("right-aligns a single-column table", () => {
    const input = ["| n |", "| ---: |", "| 1 |"].join("\n")

    expect(formatMarkdownTables(input)).toBe(["|   n |", "| --: |", "|   1 |"].join("\n"))
  })
})

describe("escaped pipes", () => {
  test("does not treat \\| as a column delimiter", () => {
    const input = ["| Kind | A \\| B |", "| --- | --- |", "| x | y \\| z |"].join("\n")

    expect(formatMarkdownTables(input)).toBe(
      ["| Kind | A \\| B |", "| ---- | ----- |", "| x    | y \\| z |"].join("\n"),
    )
  })

  test("keeps escaped pipes intact while aligning other cells", () => {
    const input = [
      "| Type | Value | Desc |",
      "| :--- | :---: | ---: |",
      "| enum | A \\| B \\| C | ok |",
    ].join("\n")

    expect(formatMarkdownTables(input)).toBe(
      [
        "| Type |   Value   | Desc |",
        "| ---- | :-------: | ---: |",
        "| enum | A \\| B \\| C |   ok |",
      ].join("\n"),
    )
  })
})

describe("wide characters", () => {
  test("counts CJK characters as two columns", () => {
    const input = ["| 名前 | Value |", "| --- | --- |", "| 日本 | x |"].join("\n")

    expect(formatMarkdownTables(input)).toBe(
      ["| 名前 | Value |", "| ---- | ----- |", "| 日本 | x     |"].join("\n"),
    )
  })

  test("pads ASCII cells next to CJK cells", () => {
    const input = ["| 文字 | b |", "| --- | --- |", "| x | y |"].join("\n")

    expect(formatMarkdownTables(input)).toBe(
      ["| 文字 | b   |", "| ---- | --- |", "| x    | y   |"].join("\n"),
    )
  })
})

describe("concealment-mode widths", () => {
  test("measures bold text by its rendered width", () => {
    const input = ["| **bold** | x |", "| --- | --- |", "| bb | y |"].join("\n")

    expect(formatMarkdownTables(input)).toBe(
      ["| **bold** | x   |", "| ---- | --- |", "| bb   | y   |"].join("\n"),
    )
  })
})

describe("non-table content", () => {
  test("leaves prose and fenced code untouched", () => {
    const input = ["before", "```", "| a | b |", "| --- | --- |", "```", "after"].join("\n")

    expect(formatMarkdownTables(input)).toBe(input)
  })

  test("leaves a structurally invalid table untouched and explains why", () => {
    const input = ["| a | b |", "| --- | --- |", "| c | d | e |"].join("\n")

    expect(formatMarkdownTables(input)).toBe(
      [input, "<!-- table not formatted: invalid structure -->"].join("\n"),
    )
  })
})
