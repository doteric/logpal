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

  it('uses independent random samples when no request ID is provided', () => {
    const rates = createSamplingRates({ info: 0.5 });
    const random = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.75);

    expect(shouldSample('info', rates, undefined)).toBe(true);
    expect(shouldSample('info', rates, undefined)).toBe(false);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['request-1', 0.10133399325422943],
    ['request-2', 0.4366181727964431],
    ['', 0.8894159947521985],
    ['żółć-🚀', 0.985108382999897],
  ])(
    'keeps a stable sampling threshold for request ID %j',
    (requestId, sample) => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(0);

      // Fixed vectors keep decisions compatible across services and versions.
      expect(
        shouldSample(
          'info',
          createSamplingRates({ info: sample }),
          undefined,
          requestId,
        ),
      ).toBe(false);
      random.mockReturnValue(0.999);
      expect(
        shouldSample(
          'warn',
          createSamplingRates({ warn: sample + 1 / 0x1_0000_0000 }),
          undefined,
          requestId,
        ),
      ).toBe(true);
      expect(random).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', 'request-1'])(
    'honors rate limits and bypasses with request ID %j',
    (requestId) => {
      const rates = createSamplingRates({ info: 0, warn: 1, error: 0 });

      expect(shouldSample('info', rates, undefined, requestId)).toBe(false);
      expect(shouldSample('warn', rates, undefined, requestId)).toBe(true);
      expect(shouldSample('error', rates, undefined, requestId)).toBe(true);
      expect(shouldSample('info', rates, () => true, requestId)).toBe(true);
    },
  );
});
