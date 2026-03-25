import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import log from "../src/index.js"

describe("log", () => {
  let logSpy, warnSpy, errorSpy

  beforeEach(() => {
    log.configure({ level: "debug", pretty: false })
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    log.configure({ level: "info", pretty: true })
  })

  it("writes json when pretty is false", () => {
    log.info("hello")
    expect(logSpy).toHaveBeenCalledOnce()
    const entry = JSON.parse(logSpy.mock.calls[0][0])
    expect(entry.level).toBe("info")
    expect(entry.msg).toBe("hello")
    expect(entry.ts).toBeTypeOf("number")
  })

  it("includes data fields in output", () => {
    log.info("started", { port: 8080 })
    const entry = JSON.parse(logSpy.mock.calls[0][0])
    expect(entry.port).toBe(8080)
  })

  it("respects log level filtering", () => {
    log.configure({ level: "warn" })
    log.debug("nope")
    log.info("nope")
    log.warn("yes")
    log.error("yes")
    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it("uses console.error for error level", () => {
    log.error("bad")
    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it("uses console.warn for warn level", () => {
    log.warn("careful")
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it("uses console.log for info and debug", () => {
    log.debug("trace")
    log.info("info")
    expect(logSpy).toHaveBeenCalledTimes(2)
  })

  it("handles Error as first argument", () => {
    const err = new Error("connection refused")
    log.error(err)
    const entry = JSON.parse(errorSpy.mock.calls[0][0])
    expect(entry.msg).toBe("connection refused")
    expect(entry.err.message).toBe("connection refused")
    expect(entry.err.stack).toBeTypeOf("string")
  })

  it("serializes Error objects in data", () => {
    const err = new Error("timeout")
    err.code = "ETIMEOUT"
    log.error("failed", { cause: err })
    const entry = JSON.parse(errorSpy.mock.calls[0][0])
    expect(entry.cause.message).toBe("timeout")
    expect(entry.cause.code).toBe("ETIMEOUT")
    expect(entry.cause.stack).toBeTypeOf("string")
  })

  it("suppresses all output at level none", () => {
    log.configure({ level: "none" })
    log.debug("x")
    log.info("x")
    log.warn("x")
    log.error("x")
    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe("child loggers", () => {
  let logSpy

  beforeEach(() => {
    log.configure({ level: "debug", pretty: false })
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    log.configure({ level: "info", pretty: true })
  })

  it("carries context into log entries", () => {
    const child = log.child({ reqId: "abc" })
    child.info("handled")
    const entry = JSON.parse(logSpy.mock.calls[0][0])
    expect(entry.reqId).toBe("abc")
    expect(entry.msg).toBe("handled")
  })

  it("exposes context on the child", () => {
    const child = log.child({ reqId: "abc" })
    expect(child.context).toEqual({ reqId: "abc" })
  })

  it("accumulates context through nested children", () => {
    const a = log.child({ connId: "c1" })
    const b = a.child({ db: "postgres" })
    b.info("query")
    const entry = JSON.parse(logSpy.mock.calls[0][0])
    expect(entry.connId).toBe("c1")
    expect(entry.db).toBe("postgres")
  })

  it("child context does not bleed into parent", () => {
    const parent = log.child({ a: 1 })
    parent.child({ b: 2 })
    parent.info("parent")
    const entry = JSON.parse(logSpy.mock.calls[0][0])
    expect(entry.a).toBe(1)
    expect(entry.b).toBeUndefined()
  })

  it("data overrides context when keys collide", () => {
    const child = log.child({ env: "staging" })
    child.info("override", { env: "production" })
    const entry = JSON.parse(logSpy.mock.calls[0][0])
    expect(entry.env).toBe("production")
  })

  it("root logger has empty context", () => {
    expect(log.context).toEqual({})
  })
})

describe("pretty output", () => {
  let logSpy

  beforeEach(() => {
    log.configure({ level: "debug", pretty: true })
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    log.configure({ level: "info", pretty: true })
  })

  it("outputs formatted string instead of json", () => {
    log.info("hello")
    const output = logSpy.mock.calls[0][0]
    expect(output).toContain("INFO")
    expect(output).toContain("hello")
    expect(() => JSON.parse(output)).toThrow()
  })

  it("includes data fields on separate lines", () => {
    log.info("started", { port: 8080, host: "localhost" })
    const output = logSpy.mock.calls[0][0]
    expect(output).toContain("port:")
    expect(output).toContain("8080")
    expect(output).toContain("host:")
    expect(output).toContain("localhost")
  })
})

describe("configure", () => {
  let logSpy

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    log.configure({ level: "info", pretty: true })
  })

  it("partial configure only changes specified fields", () => {
    log.configure({ level: "debug", pretty: false })
    log.configure({ level: "error" })
    log.info("should be suppressed")
    expect(logSpy).not.toHaveBeenCalled()
    log.error("should appear")
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    log.error("json")
    const output = errorSpy.mock.calls[0][0]
    expect(() => JSON.parse(output)).not.toThrow()
  })
})
