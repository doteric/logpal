---
name: logpal
description: Add or change structured event logging with the log-pal package, including format schemas, handler instrumentation, and checking output completeness after changes.
---

# LogPal

Create one long-lived `LogPal` instance per application and call `logpal.event(options, handler)` once per invocation. Helpers within the handler can call the same instance through its AsyncLocalStorage context. Await work that contributes log data before the handler completes; the event finalizes automatically on completion or failure.

```ts
import LogPal from 'log-pal';

const logpal = new LogPal({
  eventType: 'http-request',
  format: 'httpRequest',
  validateOutput: true,
});

await logpal.event({ requestId: 'request-id' }, async () => {
  logpal.addData({
    request: { path: '/users', method: 'GET' },
    response: { statusCode: 200, durationMs: 18 },
  });
});
```

Use `httpRequest` for HTTP request and response data, `action` for generic context and completed actions, or a custom Zod object schema for application requirements. Custom schemas describe only the data passed to `addData()`; LogPal adds event metadata and the error, warning, external call, and action collections. Record completed actions with `addAction()` and finish handles returned by `initExternalCall()` before the event completes.

## Re-check completeness after logging changes

When changes to log fields, schemas, handlers, helpers, or control flow could result in necessary data no longer being logged, consider temporarily re-enabling output validation by setting `validateOutput: true` on the affected application's `LogPal` instance.

- Keep validation enabled for a period that covers representative traffic and the affected success and failure paths. Choose the observation window based on traffic and path coverage rather than a fixed universal duration.
- Inspect emitted output for the expected data and `_logpal.errors`, which report missing or invalid schema fields by path and issue code. Fix omissions and re-check the affected paths before considering returning to `validateOutput: false` for performance.
- Ensure the schema requires the data that matters. Validation cannot detect missing information that the schema leaves optional or unconstrained; use a custom schema to require essential application fields. The built-in `action` format does not require individual context fields.
- Ensure representative events are emitted during the check. Validation does not bypass sampling; use the application's sampling settings or the per-event `shouldBypassSampling` callback when needed to observe affected events.

`validateOutput` must explicitly be `true` or `false`. With `true`, LogPal parses collected data once at finalization, applies defaults and transformations on success, and attaches `_logpal.errors` on validation failure without dropping an otherwise sampled-in event. With `false`, parsing, defaults, transformations, and validation diagnostics are skipped. Account for defaults and transformations when deciding whether to disable validation again.
