import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import LogPal from './index.js';

const createOutput = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const readLog = (
  output: ReturnType<typeof createOutput>,
  level: 'info' | 'warn' | 'error',
  index = 0,
) => {
  const serialized = output[level].mock.calls[index]?.[0];
  if (typeof serialized !== 'string') {
    throw new Error('Expected a serialized log entry');
  }
  return JSON.parse(serialized);
};

describe('LogPal full functionality', () => {
  it('logs the effective instance configuration during initialization', () => {
    const output = createOutput();
    new LogPal({
      eventType: 'account-operation',
      format: 'lambda',
      sampling: { info: 0.2 },
      logger: output,
    });

    expect(readLog(output, 'info')).toEqual({
      eventType: 'logpal-init',
      logpal: {
        eventType: 'account-operation',
        format: 'lambda',
        sampling: { error: 1, warn: 1, info: 0.2 },
      },
    });
  });

  it('can disable the initialization log', () => {
    const output = createOutput();
    new LogPal({
      eventType: 'account-operation',
      format: 'lambda',
      logInitialization: false,
      logger: output,
    });

    expect(output.info).not.toHaveBeenCalled();
  });

  it('creates an HTTP logger and emits complete and invalid events', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'http-request',
      format: 'httpRequest',
      logger: output,
    });

    await logpal.event({ requestId: 'request-complete' }, async () => {
      logpal.addData({
        request: {
          path: '/users',
          method: 'GET',
          headers: { accept: 'application/json' },
          query: { page: '1' },
        },
        response: {
          statusCode: 200,
          durationMs: 18,
          headers: { 'content-type': 'application/json' },
        },
      });
    });

    await logpal.event({ requestId: 'request-incomplete' }, async () => {
      logpal.addData({
        request: { path: '/users' },
        response: { statusCode: 503 },
      });
    });

    expect(readLog(output, 'info', 1)).toEqual({
      eventType: 'http-request',
      requestId: 'request-complete',
      errors: [],
      warnings: [],
      externalCalls: [],
      request: {
        path: '/users',
        method: 'GET',
        headers: { accept: 'application/json' },
        query: { page: '1' },
      },
      response: {
        statusCode: 200,
        durationMs: 18,
        headers: { 'content-type': 'application/json' },
      },
    });

    expect(readLog(output, 'info', 2)).toEqual({
      eventType: 'http-request',
      requestId: 'request-incomplete',
      errors: [],
      warnings: [],
      externalCalls: [],
      request: { path: '/users' },
      response: { statusCode: 503 },
      _logpal: {
        errors: [
          { path: 'request.method', code: 'invalid_type' },
          { path: 'response.durationMs', code: 'invalid_type' },
        ],
      },
    });
  });

  it('infers nested Lambda fields from its predefined schema', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'summary-log',
      format: 'lambda',
      logger: output,
    });

    await logpal.event({ requestId: 'request-lambda' }, async () => {
      logpal.addData({ functionName: 'handler', custom: { customField: 1 } });
      if (false) {
        // @ts-expect-error Lambda fields are inferred from the Zod schema.
        logpal.addData({ functionName: 42 });
      }
    });

    expect(readLog(output, 'info', 1)).toEqual({
      eventType: 'summary-log',
      requestId: 'request-lambda',
      functionName: 'handler',
      errors: [],
      warnings: [],
      externalCalls: [],
      custom: { customField: 1 },
    });
  });

  it('rejects top-level lambda entries outside the schema', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'summary-log',
      format: 'lambda',
      logger: output,
    });

    await logpal.event({ requestId: 'request-invalid-lambda' }, async () => {
      logpal.addData({
        functionName: 'handler',
        // @ts-expect-error The schema does not allow unknown top-level fields.
        unexpected: true,
      });
    });

    expect(readLog(output, 'info', 1)).toEqual({
      eventType: 'summary-log',
      requestId: 'request-invalid-lambda',
      functionName: 'handler',
      errors: [],
      warnings: [],
      externalCalls: [],
      unexpected: true,
      _logpal: {
        errors: [{ path: 'unexpected', code: 'unrecognized_keys' }],
      },
    });
  });

  it('infers data fields from a caller-provided Zod schema', async () => {
    const output = createOutput();
    const format = z.object({
      operation: z.object({ name: z.string() }),
    });
    const logpal = new LogPal({
      eventType: 'custom-event',
      format,
      logger: output,
    });

    await logpal.event({ requestId: 'request-custom' }, async () => {
      logpal.addData({ operation: { name: 'created' } });
      if (false) {
        // @ts-expect-error The custom schema requires a string operation name.
        logpal.addData({ operation: { name: 7 } });
      }
    });

    expect(readLog(output, 'info', 1)).toEqual({
      eventType: 'custom-event',
      requestId: 'request-custom',
      errors: [],
      warnings: [],
      externalCalls: [],
      operation: { name: 'created' },
    });
  });

  it('records and rethrows handler errors', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'summary-log',
      format: 'lambda',
      logger: output,
    });

    await expect(
      logpal.event({ requestId: 'request-error' }, async () => {
        throw new Error('handler failed');
      }),
    ).rejects.toThrow('handler failed');

    expect(readLog(output, 'error')).toEqual({
      eventType: 'summary-log',
      requestId: 'request-error',
      errors: [
        {
          type: 'unhandled-error',
          message: 'handler failed',
          details: expect.objectContaining({ name: 'Error' }),
        },
      ],
      warnings: [],
      externalCalls: [],
    });
  });

  it('tracks finished and unfinished external calls', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'summary-log',
      format: 'lambda',
      logInitialization: false,
      logger: output,
    });

    await logpal.event({ requestId: 'request-external-call' }, async () => {
      const accountsCall = logpal.initExternalCall({
        url: 'https://accounts.example.com',
        method: 'POST',
      });
      accountsCall.finish({
        statusCode: 200,
        custom: { accountId: 'account-1' },
      });
      logpal.initExternalCall({
        url: 'https://cache.example.com',
        method: 'GET',
      });
    });

    expect(readLog(output, 'info').externalCalls).toEqual([
      {
        url: 'https://accounts.example.com',
        method: 'POST',
        status: 'finished',
        statusCode: 200,
        custom: { accountId: 'account-1' },
        durationMs: expect.any(Number),
      },
      {
        url: 'https://cache.example.com',
        method: 'GET',
        status: 'started',
      },
    ]);
  });

  it('logs attempted changes after an event has finalized', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'summary-log',
      format: 'lambda',
      logInitialization: false,
      logger: output,
    });

    expect(() =>
      logpal.event({ requestId: 'request-after-final' }, () => {
        logpal.finalize();
        logpal.addData({ functionName: 'late-call' });
      }),
    ).toThrow('Cannot modify a finalized LogPal event');

    expect(readLog(output, 'error')).toEqual({
      eventType: 'logpal-call-after-finalization',
      id: 'request-after-final',
      logpal: {
        eventType: 'summary-log',
        call: 'addData',
        data: { functionName: 'late-call' },
      },
    });
  });
});
