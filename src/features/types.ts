export type LogLevel = 'error' | 'warn' | 'info';

export interface SamplingOptions {
  error?: number;
  warn?: number;
  info?: number;
}

export interface LogPalOptions<Format = unknown> {
  eventType: string;
  format: Format;
  sampling?: SamplingOptions;
  /** Emits an info log describing this instance when it is created. Defaults to true. */
  logInitialization?: boolean;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export interface LogPalEventOptions {
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

export interface ExternalCallData extends ProvidedInitExternalCallData {
  status: string;
  statusCode?: number;
  durationMs?: number;
}
