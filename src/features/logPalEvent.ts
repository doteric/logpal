import { resolveFormat } from '../formats/index.js';
import { errorDetails, isRecord, mergeLogData } from './loggerUtils.js';
import { shouldSample } from './sampling.js';
import type { FormatOption, LogDataFor } from '../formats/index.js';
import type { LogLevel, LogPalEventOptions } from './types.js';
import type { ZodType } from 'zod';

type EventLogger = Pick<Console, 'info' | 'warn' | 'error'>;
type SamplingRates = Record<LogLevel, number>;

/** State and finalization for one LogPal event. */
export class LogPalEvent<Format extends FormatOption> {
  private readonly format: ZodType;
  private finalized = false;
  private level: LogLevel = 'info';
  private data: Record<string, unknown> = {};
  private readonly errors: Record<string, unknown>[] = [];
  private readonly warnings: Record<string, unknown>[] = [];
  private readonly upstreamResponses: Record<string, unknown>[] = [];

  public constructor(
    private readonly eventName: string,
    format: Format,
    private readonly options: LogPalEventOptions,
    private readonly sampling: SamplingRates,
    private readonly output: EventLogger,
  ) {
    this.format = resolveFormat(format);
  }

  public addData(data: LogDataFor<Format>) {
    this.assertOpen();
    if (!isRecord(data)) throw new TypeError('addData expects an object');
    this.data = mergeLogData(this.data, data);
  }

  public addError(data: Record<string, unknown>) {
    this.assertOpen();
    this.level = 'error';
    this.errors.push(data);
  }

  public addWarning(data: Record<string, unknown>) {
    this.assertOpen();
    if (this.level !== 'error') this.level = 'warn';
    this.warnings.push(data);
  }

  public addUpstreamResponse(data: Record<string, unknown>) {
    this.assertOpen();
    this.upstreamResponses.push(data);
  }

  public handle<T>(handler: () => T): T | Promise<T> {
    try {
      const result = handler();
      if (result instanceof Promise) {
        return result
          .catch((error: unknown) => {
            this.recordUnhandledError(error);
            throw error;
          })
          .finally(() => this.finalize());
      }

      this.finalize();
      return result;
    } catch (error) {
      this.recordUnhandledError(error);
      this.finalize();
      throw error;
    }
  }

  public finalize() {
    if (this.finalized) return;
    this.finalized = true;

    const validation = this.format.safeParse(this.data);
    const validatedData =
      validation.success && isRecord(validation.data)
        ? validation.data
        : this.data;
    const log: Record<string, unknown> = {
      ...validatedData,
      eventType: this.eventName,
      requestId: this.options.requestId,
      errors: this.errors,
      warnings: this.warnings,
      upstreamResponses: this.upstreamResponses,
    };
    if (
      !shouldSample(
        this.level,
        this.sampling,
        this.options.shouldBypassSampling,
      )
    ) {
      return;
    }

    if (!validation.success) {
      log._logpal = {
        errors: validation.error.issues.map((issue) => ({
          path:
            issue.code === 'unrecognized_keys'
              ? issue.keys.join('.')
              : issue.path.join('.'),
          code: issue.code,
        })),
      };
      this.output[this.level](JSON.stringify(log));
      return;
    }
    this.output[this.level](JSON.stringify(log));
  }

  private recordUnhandledError(error: unknown) {
    if (this.finalized) return;
    this.level = 'error';
    this.errors.push({
      type: 'unhandled-error',
      message: error instanceof Error ? error.message : 'Unhandled error',
      details: errorDetails(error),
    });
  }

  private assertOpen() {
    if (this.finalized)
      throw new Error('Cannot modify a finalized LogPal event');
  }
}
