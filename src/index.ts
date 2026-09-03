import { AsyncLocalStorage } from 'node:async_hooks';
import merge from 'lodash.merge';

export type LogLevel = 'error' | 'warn' | 'info';
export interface SamplingOptions {
  error?: number;
  warn?: number;
  info?: number;
}
export interface LogPalOptions {
  format?: 'lambda';
  sampling?: SamplingOptions;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}
export interface NewLoggerOptions {
  requestId?: string;
  shouldBypassSampling?: () => boolean;
}
export interface LogPalLogger {
  addData(data: Record<string, unknown>): void;
  addError(data: Record<string, unknown>): void;
  addWarning(data: Record<string, unknown>): void;
  addUpstreamResponse(data: Record<string, unknown>): void;
  finalize(): void;
}

const errorDetails = (error: unknown) =>
  error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;
const DEFAULT_SAMPLING: Required<SamplingOptions> = {
  error: 1,
  warn: 1,
  info: 1,
};

const normalizeRate = (rate: number | undefined) => {
  if (rate === undefined || Number.isNaN(rate)) return 1;
  return Math.max(0, Math.min(1, rate));
};

const missingParameters = (
  data: Record<string, unknown>,
  parameters: string[],
) => parameters.filter((parameter) => data[parameter] === undefined);

class LambdaLogger implements LogPalLogger {
  private readonly requestId: string | undefined;
  private readonly bypassSampling: () => boolean;
  private readonly sampling: Required<SamplingOptions>;
  private readonly output: Pick<Console, 'info' | 'warn' | 'error'>;
  private finalized = false;
  private level: LogLevel = 'info';
  private data: Record<string, unknown> = {};
  private errors: Record<string, unknown>[] = [];
  private warnings: Record<string, unknown>[] = [];
  private upstreamResponses: Record<string, unknown>[] = [];

  public constructor(
    options: NewLoggerOptions,
    sampling: Required<SamplingOptions>,
    output: Pick<Console, 'info' | 'warn' | 'error'>,
  ) {
    this.requestId = options.requestId;
    this.bypassSampling = options.shouldBypassSampling ?? (() => false);
    this.sampling = sampling;
    this.output = output;
  }

  public addData(data: Record<string, unknown>) {
    this.data = merge(this.data, data);
  }

  public addError(data: Record<string, unknown>) {
    this.level = 'error';
    this.errors.push(data);
  }

  public addWarning(data: Record<string, unknown>) {
    if (this.level !== 'error') this.level = 'warn';
    this.warnings.push(data);
  }

  public addUpstreamResponse(data: Record<string, unknown>) {
    this.upstreamResponses.push(data);
  }

  public finalize() {
    if (this.finalized) return;
    this.finalized = true;

    if (!this.bypassSampling() && Math.random() >= this.sampling[this.level])
      return;

    const missing = [
      ...(this.requestId === undefined ? ['requestId'] : []),
      ...this.errors.flatMap((error) =>
        missingParameters(error, ['type', 'message', 'details']),
      ),
      ...this.warnings.flatMap((warning) =>
        missingParameters(warning, ['type', 'message', 'details']),
      ),
    ];

    const log = {
      ...this.data,
      eventType: 'summary-log',
      requestId: this.requestId,
      errors: this.errors,
      warnings: this.warnings,
      upstreamResponses: this.upstreamResponses,
      _logpal: {
        format: 'lambda',
        level: this.level,
        missingParameters: missing,
      },
    };

    this.output[this.level](JSON.stringify(log));
  }
}

export class initLogPal {
  private readonly sampling: Required<SamplingOptions>;
  private readonly output: Pick<Console, 'info' | 'warn' | 'error'>;
  private readonly storage = new AsyncLocalStorage<LogPalLogger>();

  public constructor(options: LogPalOptions = {}) {
    this.sampling = {
      ...DEFAULT_SAMPLING,
      ...Object.fromEntries(
        Object.entries(options.sampling ?? {}).map(([level, rate]) => [
          level,
          normalizeRate(rate),
        ]),
      ),
    } as Required<SamplingOptions>;
    this.output = options.logger ?? console;
  }

  public new(options: NewLoggerOptions = {}) {
    return new LambdaLogger(options, this.sampling, this.output);
  }

  public current() {
    return this.storage.getStore();
  }

  public run<T>(logger: LogPalLogger, callback: () => T) {
    try {
      const result = this.storage.run(logger, callback);

      if (result instanceof Promise) {
        return result
          .catch((error: unknown) => {
            logger.addError({
              type: 'unhandled-error',
              message:
                error instanceof Error ? error.message : 'Unhandled error',
              details: errorDetails(error),
            });
            throw error;
          })
          .finally(() => logger.finalize());
      }

      logger.finalize();
      return result;
    } catch (error) {
      logger.addError({
        type: 'unhandled-error',
        message: error instanceof Error ? error.message : 'Unhandled error',
        details: errorDetails(error),
      });
      logger.finalize();
      throw error;
    }
  }
}

export default initLogPal;
