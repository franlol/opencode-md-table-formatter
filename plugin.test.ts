import { describe, expect, test } from "bun:test"
import plugin, { TABLE_INSTRUCTION } from "./index.ts"

type SystemPart = { type: "text"; text: string }
type ContextEvent = { system: SystemPart[] }
type ContextHook = (event: ContextEvent) => void | Promise<void>

function stubContext() {
  const hooks: Array<{ name: string; callback: ContextHook }> = []
  const ctx = {
    session: {
      hook: async (name: string, callback: ContextHook) => {
        hooks.push({ name, callback })
        return { dispose: async () => {} }
      },
    },
  }
  return { hooks, ctx }
}

async function loadPlugin() {
  const { hooks, ctx } = stubContext()
  await plugin.setup(ctx as unknown as Parameters<typeof plugin.setup>[0])
  return hooks
}

describe("plugin definition", () => {
  test("exposes a stable id for plugin status reporting", () => {
    expect(plugin.id).toBe("md-table-formatter")
  })

  test("registers a session context hook during setup", async () => {
    const hooks = await loadPlugin()

    expect(hooks.map((hook) => hook.name)).toEqual(["context"])
  })

  test("appends the instruction without touching existing system parts", async () => {
    const hooks = await loadPlugin()
    const event: ContextEvent = { system: [{ type: "text", text: "existing" }] }

    await hooks[0].callback(event)

    expect(event.system).toEqual([
      { type: "text", text: "existing" },
      { type: "text", text: TABLE_INSTRUCTION },
    ])
  })

  test("instruction states the alignment rules the formatter enforces", () => {
    expect(TABLE_INSTRUCTION).toContain("aligned columns")
    expect(TABLE_INSTRUCTION).toContain(":---, :--:, ---:")
    expect(TABLE_INSTRUCTION).toContain("\\|")
    expect(TABLE_INSTRUCTION).toContain("CJK")
  })
})
