import merge from 'lodash.merge';

// TODO: Think about using pino? But could be an overkill for the authorizer lambda.
const logger = console;

interface ParamsType {
  requestId: string;
}

interface ErrorObjectType {
  /** Kebab case format, for example: example-error-type */
  type: string;

  message: string;
  details: unknown;
}

interface UpstreamResponseType {
  /** A unique identifier for the upstream service, for example "riga" or "dynamodb". This is used to identify the source of the response in the logs. */
  id: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  extraDetails?: Record<string, unknown>;
}

// 100% by default, but can be configured with env var to reduce noise in logs for successful requests
const DEFAULT_SUCCESS_SAMPLE_RATE = 1;
let sampledOutSummaryLogCount = 0;

const normalizeSampleRate = (value: string | undefined): number => {
  if (value === undefined) {
    return DEFAULT_SUCCESS_SAMPLE_RATE;
  }

  const parsed = Number.parseFloat(value);

  if (Number.isNaN(parsed)) {
    return DEFAULT_SUCCESS_SAMPLE_RATE;
  }

  return Math.max(0, Math.min(1, parsed));
};

class EventWideLogger {
  private requestId: string;

  private successSampleRate: number;

  private finalized: boolean;

  public data: Record<string, unknown> = {};

  public errors: ErrorObjectType[] = [];

  public warnings: ErrorObjectType[] = [];

  public upstreamResponses: UpstreamResponseType[] = [];

  constructor(params: ParamsType) {
    this.requestId = params.requestId;
    this.successSampleRate = normalizeSampleRate(
      process.env['AUTHORIZER_SUCCESS_LOG_SAMPLE_RATE'],
    );
    this.finalized = false;
  }

  addData(data: Record<string, unknown>) {
    const mergedData = merge(this.data, data);
    this.data = mergedData;
  }

  /**
   * addWarning is used for non-critical issues that are expected behaviour, for example when RIGA returns an error response due to invalid client request.
   * In case the summary log has already been finalized, it will emit a standalone log event with the warning details.
   * @param fallbackEventType - used to specify the event type for the standalone log event in case the summary log has already been finalized. If not provided, a default value will be used.
   */
  addWarning(data: ErrorObjectType, fallbackEventType?: string) {
    // If summary was already finalized, emit a standalone log event.
    if (this.isFinalized()) {
      console.warn(
        JSON.stringify({
          eventType: fallbackEventType || 'standalone-warning',
          requestId: this.getRequestId(),
          ...data,
        }),
      );
    } else {
      // Otherwise, keep it in the request-wide summary log.
      this.warnings.push(data);
    }
  }

  /**
   * addError is used for unexpected issues that might require attention, for example when the RIGA passthrough endpoint throws an error.
   * In case the summary log has already been finalized, it will emit a standalone log event with the error details.
   * @param fallbackEventType - used to specify the event type for the standalone log event in case the summary log has already been finalized. If not provided, a default value will be used.
   */
  addError(data: ErrorObjectType, fallbackEventType?: string) {
    // If summary was already finalized, emit a standalone log event.
    if (this.isFinalized()) {
      console.error(
        JSON.stringify({
          eventType: fallbackEventType || 'standalone-error',
          requestId: this.getRequestId(),
          ...data,
        }),
      );
    } else {
      // Otherwise, keep it in the request-wide summary log.
      this.errors.push(data);
    }
  }

  /**
   * addUpstreamResponse is used to log responses from upstream services that the application interacts with.
   */
  addUpstreamResponse(data: UpstreamResponseType) {
    this.upstreamResponses.push(data);
  }

  getRequestId() {
    return this.requestId;
  }

  isFinalized() {
    return this.finalized;
  }

  private shouldLogSummary() {
    if (this.errors.length > 0 || this.warnings.length > 0) {
      return true;
    }

    return Math.random() < this.successSampleRate;
  }

  finalize() {
    this.finalized = true;

    const shouldLogSummary = this.shouldLogSummary();

    if (!shouldLogSummary) {
      sampledOutSummaryLogCount += 1;
      return;
    }

    const sampledOutSummaryLogCountToLog = sampledOutSummaryLogCount;
    sampledOutSummaryLogCount = 0;

    logger.info(
      JSON.stringify({
        ...this.data,
        eventType: 'summary-log',
        version: process.env.VERSION,
        requestId: this.requestId,
        errors: this.errors,
        warnings: this.warnings,
        upstreamResponses: this.upstreamResponses,
        sampling: {
          successSampleRate: this.successSampleRate,
          // Amount of summary logs that were not logged before this one.
          sampledOutSummaryLogCount: sampledOutSummaryLogCountToLog,
        },
      }),
    );
  }
}

export const __resetSampledOutSummaryLogCountForTests = () => {
  sampledOutSummaryLogCount = 0;
};

export type EventWideLoggerInstanceType = InstanceType<typeof EventWideLogger>;

export default EventWideLogger;

// TODO: Use AsyncLocalStorage and create function to get the current logger instance.
