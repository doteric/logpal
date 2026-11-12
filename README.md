<p align="center">
  <img src="web/assets/logpal-charcoal-circle.svg" alt="LogPal logo" width="240" />
</p>

# LogPal

LogPal creates one long-lived logging instance and one event logger per invocation. Each event collects data, warnings, errors, and external calls and writes one structured JSON log. Sampling can reduce successful-request noise while errors and warnings use their own rates.

Inspired by https://loggingsucks.com/

Most of the project currently is "vibe-coded" to quickly get a proof of concept running, however, it has been "vibe-coded" with very specific rules and intentions in mind. Later as we progress we can improve this further if the tool actually becomes useful.

## Lambda

The example is split into [examples/lambda/handler.ts](examples/lambda/handler.ts), [examples/lambda/logpal.ts](examples/lambda/logpal.ts), and [examples/lambda/operations.ts](examples/lambda/operations.ts). The `LogPal` instance is created once. Each handler invocation calls `logpal.event()` with its per-event options and callback.

```ts
import LogPal from 'log-pal';

const logpal = new LogPal({
  eventType: 'summary-log',
  format: 'lambda',
  sampling: { error: 1, warn: 1, info: 0.1 },
});

export const handler = async (event: unknown) => {
  return logpal.event(
    {
      requestId: 'request-id-from-lambda',
      shouldBypassSampling: () => true,
    },
    async () => {
      logpal.addData({
        context: { functionName: 'handler' },
        userId: 'user-id',
      });
    },
  );
};
```

`event()` uses Node's `AsyncLocalStorage`, so helper functions can call `logpal.addData()` without passing the event through every function call. It finalizes the log when the callback completes. If the callback throws or rejects, it records an `unhandled-error`, finalizes the log, and re-throws the original error.

## HTTP Request

The HTTP format checks the request path, method, response status code, and duration. Supply all of them through `addData()`. The `format` option determines the `addData()` input type; no explicit type arguments are needed.

See [examples/httpRequest/handler.ts](examples/httpRequest/handler.ts) and [examples/httpRequest/logpal.ts](examples/httpRequest/logpal.ts) for a handler that records the request, measures the operation duration, and records the response.

```ts
const httpLog = new LogPal({
  eventType: 'http-request',
  format: 'httpRequest',
});

await httpLog.event({ requestId: 'trace-id' }, async () => {
  httpLog.addData({
    request: { path: '/users', method: 'GET' },
    response: { statusCode: 200, durationMs: 18 },
    userId: 'user-id',
  });
});
```

Custom Zod object schemas are also supported. Define only the data passed through `addData()`; LogPal adds the event metadata and log collections during finalization:

```ts
import { z } from 'zod';

const accountFormat = z.object({
  account: z.object({ id: z.string() }),
  operation: z.string(),
});

const logpal = new LogPal({
  eventType: 'account-operation',
  format: accountFormat,
});

await logpal.event({}, async () => {
  logpal.addData({ account: { id: 'acct-1' }, operation: 'read' });
});
```

## Output

Both formats emit JSON. If required format fields or conventional error fields are missing, the log includes `_logpal.errors` with the missing field paths. Valid logs omit `_logpal`.

The initial API is intentionally small: `event`, `addData`, `addError`, `addWarning`, and `initExternalCall`. `initExternalCall` records a call immediately and returns a call handle. Finish it after the response arrives; calls that never finish remain marked as started in the finalized event log.

```ts
const logpalExternalCall = logpal.initExternalCall({
  url: 'https://service.example.com',
  method: 'POST',
});

const response = await fetch('https://service.example.com', { method: 'POST' });
logpalExternalCall.finish({
  statusCode: response.status,
  custom: { retried: false },
});
```

## "Thinking aloud"

What should logs actually contain? Shouldn't external calls be tracked separately and not in logs? Logs should contain only errors?
(TODO: Consider above thought)
