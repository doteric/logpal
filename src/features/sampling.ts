import { createHash } from 'node:crypto';
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
  requestId?: string,
) => {
  if (level === 'error' || shouldBypass?.() === true) return true;

  const rate = rates[level];
  if (rate === 0 || rate === 1) return rate === 1;

  // Use the same UTF-8 hash and unsigned 32-bit fraction across all instances.
  const sample =
    requestId === undefined
      ? Math.random()
      : createHash('sha256').update(requestId).digest().readUInt32BE(0) /
        0x1_0000_0000;
  return sample < rate;
};
