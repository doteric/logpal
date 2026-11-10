# LogPal Project Guidance

## Purpose

Provide fast, structured event logging with consistent formats, automatic finalization, and checks for incomplete log data.

## Architecture

- Create one `initLogPal` instance for the application and one event with `logpal.event()` per invocation.
- Use `AsyncLocalStorage` so event handlers and their helpers can call the instance's logging methods directly.
- Keep event handling, sampling, and format schemas in focused modules.
- Keep predefined Zod schemas and their inferred payload types together under `src/formats/`, with one file per format.
- Keep `src/features/types.ts` limited to shared types; do not put format-specific payload shapes there.
- Zod is the only runtime dependency.

## Implementation

- Prefer TypeScript inference, including inferred function return types. Add explicit types only where they clarify an API or are required for safe inference.
- Avoid unnecessary type aliases and interfaces. Avoid `as` assertions whenever possible.
- Keep code simple and focused; follow KISS, DRY, and SOLID where they improve clarity.
- Performance matters: avoid making logging a bottleneck, and keep finalization work bounded to the event's data and one schema validation.
- Use single quotes in TypeScript. Prettier is configured to preserve this style.

## Tests

- `src/index.test.ts` is the integration suite for the complete public logging flow.
- Keep focused unit tests beside their implementation, such as `src/features/sampling.test.ts`.
- Cover both complete logs and schema-validation failures, including the emitted `_logpal` diagnostics.
- Run `npm.cmd run compile` and `npm.cmd test -- --run` after changes.
