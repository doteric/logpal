# log-pal

`log-pal` is a small request-wide logger for AWS Lambda. It collects data, warnings, errors, and upstream responses and writes one structured JSON summary log. Sampling can reduce successful-request noise while errors and warnings use their own rates.

## Lambda

The complete example is split into [examples/lambda/handler.ts](examples/lambda/handler.ts), [examples/lambda/logpal.ts](examples/lambda/logpal.ts), and [examples/lambda/operations.ts](examples/lambda/operations.ts). The handler creates the request logger and establishes the AsyncLocalStorage context. The operation functions retrieve that logger with `logpal.current()` without receiving it as an argument.

```ts
import initLogPal from 'log-pal';

const logpal = new initLogPal({
  format: 'lambda',
  sampling: { error: 1, warn: 1, info: 0.1 },
});

export const handler = async (event: unknown) => {
  const logger = logpal.new({
    requestId: 'request-id-from-lambda',
    shouldBypassSampling: () => true,
  });

  return logpal.run(logger, async () => {
    logpal.current()?.addData({ event });
  });
};
```

`run` uses Node's `AsyncLocalStorage`, so helper functions can retrieve the current request logger with `logpal.current()` without passing it through every function call.
It finalizes the log when the callback completes. If the callback throws or rejects, `run` records an `unhandled-error`, finalizes the log, and re-throws the original error.

## Output

The Lambda formatter emits JSON. Missing optional constructor data or conventional error fields are recorded in `_logpal.missingParameters` instead of being silently lost. For example, an error without `type`, `message`, or `details` is still logged, with those missing fields listed in `_logpal`.

The initial API is intentionally small: `addData`, `addError`, `addWarning`, `addUpstreamResponse`, and `finalize`.
