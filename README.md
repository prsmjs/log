<p align="center">
  <img src=".github/logo.svg" width="80" height="80" alt="log logo">
</p>

<h1 align="center">@prsm/log</h1>

Structured logging with child contexts that outputs JSON in production and pretty-printed text in development.

## Installation

```bash
npm install @prsm/log
```

## Usage

```js
import log from '@prsm/log'

log.info('server started', { port: 8080 })
log.warn('slow query', { ms: 1200 })
log.error(new Error('connection refused'))
```

Pretty output (dev):

```
[14:32:01] INFO  server started
    port: 8080
[14:32:01] WARN  slow query
    ms: 1200
[14:32:01] ERROR connection refused
    err: connection refused
```

JSON output (production):

```json
{"level":"info","msg":"server started","port":8080,"ts":1710782521000}
```

## Child Contexts

Create loggers that carry context through a request, job, or connection.

```js
const conn = log.child({ connId: 'abc-123' })
conn.info('command received', { cmd: 'submit' })
// [14:32:01] INFO  command received
//     connId: abc-123
//     cmd: submit

const db = conn.child({ db: 'postgres' })
db.info('query', { ms: 12 })
// [14:32:01] INFO  query
//     connId: c1
//     db: postgres
//     ms: 12
```

Context accumulates. Every log from a child includes all parent context.

## Configuration

```js
log.configure({
  level: 'debug',  // debug | info | warn | error | none
  pretty: false,   // true for human-readable, false for JSON
})
```

Defaults: level `info`, pretty when `NODE_ENV !== 'production'`.

## Tracing Across Subsystems

Pass context through queue jobs, realtime commands, workflows.

```js
server.exposeCommand('submit', async (ctx) => {
  const l = log.child({ connId: ctx.connection.id })
  l.info('received')
  await queue.push({ ...ctx.payload, _trace: l.context })
})

queue.process(async (payload, task) => {
  const l = log.child({ taskId: task.uuid, ...payload._trace })
  l.info('processing')
  // every log line carries connId + taskId
})
```

## License

MIT
