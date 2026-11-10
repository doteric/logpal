import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSamplingRates, shouldSample } from './sampling.js';

describe('sampling', () => {
  afterEach(() => vi.restoreAllMocks());

  it('normalizes rates and keeps errors regardless of the configured rate', () => {
    const rates = createSamplingRates({ info: 2, warn: -1, error: 0 });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(rates).toEqual({ info: 1, warn: 0, error: 0 });
    expect(shouldSample('error', rates, undefined)).toBe(true);
    expect(shouldSample('warn', rates, undefined)).toBe(false);
    expect(shouldSample('info', rates, undefined)).toBe(true);
  });

  it('uses the optional bypass callback for sampled-out non-errors', () => {
    const rates = createSamplingRates({ info: 0 });
    const bypass = vi.fn(() => true);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(shouldSample('info', rates, bypass)).toBe(true);
    expect(bypass).toHaveBeenCalledOnce();
  });
});
