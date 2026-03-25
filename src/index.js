const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, none: 4 }

const COLORS = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
}

const RESET = "\x1b[0m"
const DIM = "\x1b[90m"

const config = {
  level: "info",
  pretty: typeof process === "undefined" || process.env?.NODE_ENV !== "production",
}

/**
 * @typedef {"debug" | "info" | "warn" | "error" | "none"} LogLevel
 */

/**
 * @typedef {Object} LogOptions
 * @property {LogLevel} [level]
 * @property {boolean} [pretty]
 */

/**
 * @typedef {Object} Logger
 * @property {Record<string, any>} context
 * @property {(ctx: Record<string, any>) => Logger} child
 * @property {(msg: string | Error, data?: Record<string, any>) => void} debug
 * @property {(msg: string | Error, data?: Record<string, any>) => void} info
 * @property {(msg: string | Error, data?: Record<string, any>) => void} warn
 * @property {(msg: string | Error, data?: Record<string, any>) => void} error
 */

/** @param {LogOptions} opts */
function configure(opts) {
  if (opts.level !== undefined) config.level = opts.level
  if (opts.pretty !== undefined) config.pretty = opts.pretty
}

function serializeError(err) {
  return { message: err.message, stack: err.stack, ...(err.code && { code: err.code }) }
}

function serializeValue(v) {
  if (v instanceof Error) return serializeError(v)
  return v
}

function serializeData(data) {
  if (!data || typeof data !== "object") return data
  const out = {}
  for (const [k, v] of Object.entries(data)) out[k] = serializeValue(v)
  return out
}

function write(level, msg, data, context) {
  if (LEVELS[level] < LEVELS[config.level]) return

  if (msg instanceof Error) {
    data = { err: msg, ...data }
    msg = msg.message
  }

  const entry = {
    level,
    msg,
    ...context,
    ...serializeData(data),
    ts: Date.now(),
  }

  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log"

  if (config.pretty) {
    const time = new Date(entry.ts).toLocaleTimeString("en-US", { hour12: false })
    const { level: _, msg: __, ts: ___, ...rest } = entry
    const entries = Object.entries(rest)
    let out = `${COLORS[level]}[${time}] ${level.toUpperCase().padEnd(5)}${RESET} ${msg}`
    if (entries.length > 0) {
      const lines = entries.map(([k, v]) => {
        const isErr = v && typeof v === "object" && v.stack
        const val = isErr ? v.message : typeof v === "object" ? JSON.stringify(v) : v
        const color = isErr ? "\x1b[31m"
          : typeof v === "number" ? "\x1b[36m"
          : typeof v === "string" ? "\x1b[32m"
          : typeof v === "boolean" ? "\x1b[35m"
          : typeof v === "object" ? "\x1b[33m"
          : DIM
        return `    ${color}${k}:${RESET} ${val}`
      })
      out += "\n" + lines.join("\n")
    }
    console[method](out)
  } else {
    console[method](JSON.stringify(entry))
  }
}

function createChild(parentContext, extraContext) {
  const context = { ...parentContext, ...extraContext }
  return {
    context,
    child: (ctx) => createChild(context, ctx),
    debug: (msg, data) => write("debug", msg, data, context),
    info: (msg, data) => write("info", msg, data, context),
    warn: (msg, data) => write("warn", msg, data, context),
    error: (msg, data) => write("error", msg, data, context),
  }
}

/** @type {Logger & { configure: (opts: LogOptions) => void }} */
const log = {
  configure,
  context: {},
  child: (ctx) => createChild({}, ctx),
  debug: (msg, data) => write("debug", msg, data, {}),
  info: (msg, data) => write("info", msg, data, {}),
  warn: (msg, data) => write("warn", msg, data, {}),
  error: (msg, data) => write("error", msg, data, {}),
}

export default log
