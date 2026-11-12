export type LogLevel = 'error' | 'warn' | 'info';

export interface SamplingOptions {
  error?: number;
  warn?: number;
  info?: number;
}

export interface LogPalOptions<Format = unknown> {
  eventType: string;
  format: Format;
  /**
   * When set to `true` validates collected event data against the format once
   * at finalization and includes failures in `_logpal.errors` without dropping
   * the log. Successful validation applies schema defaults and transformations.
   * `false` skips schema parsing (including defaults and transformations) and
   * validation diagnostics, reducing runtime work but leaving missing or invalid
   * context unchecked. TypeScript input types still apply in either mode.
   */
  validateOutput: boolean;
  sampling?: SamplingOptions;
  /** Emits an info log describing this instance when it is created. Defaults to true. */
  logInitialization?: boolean;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export interface LogPalEventOptions {
  /** Request ID - Also used to seed deterministic sampling. Use the same requestId across various services if the request initiates from the same source. */
  requestId?: string;
  /**
   * Optional extra sampling bypass. Errors already bypass sampling; return true
   * here to also keep selected non-error events.
   */
  shouldBypassSampling?: () => boolean;
}

export interface ProvidedInitExternalCallData {
  url: string;
  method: string;
  custom?: Record<string, unknown>;
}

export interface ActionData {
  /** Describes an action that has already been performed. */
  name: string;
  custom?: Record<string, unknown>;
}

export interface ExternalCallData extends ProvidedInitExternalCallData {
  status: string;
  statusCode?: number;
  durationMs?: number;
}
