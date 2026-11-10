export type LogLevel = 'error' | 'warn' | 'info';

export interface SamplingOptions {
  error?: number;
  warn?: number;
  info?: number;
}

export interface LogPalOptions<Format = unknown> {
  eventName: string;
  format: Format;
  sampling?: SamplingOptions;
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
