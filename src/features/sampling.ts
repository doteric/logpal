import type { LogLevel, SamplingOptions } from './types.js';

const DEFAULT_SAMPLING: Record<LogLevel, number> = {
  error: 1,
  warn: 1,
  info: 1,
};

const normalizeRate = (rate: number | undefined) => {
  if (rate === undefined || Number.isNaN(rate)) return 1;
  return Math.max(0, Math.min(1, rate));
};

export const createSamplingRates = (
  options: SamplingOptions | undefined,
): Record<LogLevel, number> => ({
  error: normalizeRate(options?.error ?? DEFAULT_SAMPLING.error),
  warn: normalizeRate(options?.warn ?? DEFAULT_SAMPLING.warn),
  info: normalizeRate(options?.info ?? DEFAULT_SAMPLING.info),
});

export const shouldSample = (
  level: LogLevel,
  rates: Record<LogLevel, number>,
  shouldBypass: (() => boolean) | undefined,
) =>
  level === 'error' ||
  shouldBypass?.() === true ||
  Math.random() < rates[level];
