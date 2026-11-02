import { Plugin } from "@opencode/plugin"

const INSTRUCTION = [
  "Format every markdown table you output with aligned columns:",
  "- compute each column's display width across header, separator, and body rows",
  "- pad every cell with spaces to that width, honoring alignment (:---, :--:, ---:)",
  "- keep the separator row's dashes at the full column width",
].join("\n")

export default Plugin.define({
  id: "md-table-formatter",
  async setup(ctx) {
    await ctx.session.hook("context", (event) => {
      event.system.push({ type: "text", text: INSTRUCTION })
    })
  },
})
