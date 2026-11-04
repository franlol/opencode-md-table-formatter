import { Plugin } from "@opencode/plugin"

export { formatMarkdownTables } from "./table-formatter.ts"

/**
 * Appended to the model's system instructions on every request.
 *
 * OpenCode 2 has no hook that rewrites completed assistant text, so this
 * instruction is the only mechanism left for the plugin: the model aligns the
 * tables it emits instead of the plugin aligning them afterwards.
 */
export const TABLE_INSTRUCTION = [
  "Format every markdown table you output with aligned columns:",
  "- compute each column's display width across header, separator, and body rows",
  "- pad every cell with spaces to that width, honoring alignment (:---, :--:, ---:)",
  "- keep the separator row's dashes at the full column width",
  "- escape literal pipes inside a cell as \\| so they are not read as delimiters",
  "- count wide characters (CJK, emoji) as two columns",
].join("\n")

export default Plugin.define({
  id: "md-table-formatter",
  async setup(ctx) {
    await ctx.session.hook("context", (event) => {
      event.system.push({ type: "text", text: TABLE_INSTRUCTION })
    })
  },
})
