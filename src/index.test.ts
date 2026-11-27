import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([undefined, null, 'true', 1])(
    'requires an explicit boolean validation choice, rejecting %s',
    (validateOutput) => {
      expect(() =>
        Reflect.construct(LogPal, [
          {
            eventType: 'test',
            format: 'action',
            validateOutput,
          },
        ]),
      ).toThrow('validateOutput must be explicitly set to true or false');
    },
  );

  it('requires the validation choice in TypeScript', () => {
    if (false) {
      // @ts-expect-error Callers must choose whether to validate output.
      new LogPal({ eventType: 'test', format: 'action' });
    }
  });

  it('logs the effective instance configuration during initialization', () => {
    const output = createOutput();
    new LogPal({
      validateOutput: true,
      eventType: 'account-operation',
      format: 'action',
      sampling: { info: 0.2 },
      logger: output,
    });

    expect(readLog(output, 'info')).toEqual({
      eventType: 'logpal-init',
      logpal: {
        eventType: 'account-operation',
        format: 'action',
        validateOutput: true,
        sampling: { error: 1, warn: 1, info: 0.2 },
      },
    });
  });

  it('can disable the initialization log', () => {
    const output = createOutput();
    new LogPal({
      validateOutput: true,
      eventType: 'account-operation',
      format: 'action',
      logInitialization: false,
      logger: output,
    });

    expect(output.info).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'samples the same request consistently across services (validation %s)',
    (validateOutput) => {
      const random = vi.spyOn(Math, 'random');
      for (const [eventType, randomValue] of Object.entries({
        gateway: 0,
        accounts: 0.999,
      })) {
        random.mockReturnValue(randomValue);
        const output = createOutput();
        const logpal = new LogPal({
          eventType,
          format: 'action',
          validateOutput,
          sampling: { info: 0.2, warn: 0.2 },
          logInitialization: false,
          logger: output,
        });

        for (const requestId of ['request-1', 'request-2', 'request-1']) {
          logpal.event({ requestId }, () => {
            logpal.addData({ context: { service: eventType } });
          });
          logpal.event({ requestId }, () => {
            logpal.addWarning({ message: 'Slow response' });
          });
        }

        expect(output.info).toHaveBeenCalledTimes(2);
        expect(output.warn).toHaveBeenCalledTimes(2);
        for (const index of [0, 1]) {
          expect(readLog(output, 'info', index)).toMatchObject({
            eventType,
            requestId: 'request-1',
          });
          expect(readLog(output, 'warn', index)).toMatchObject({
            eventType,
            requestId: 'request-1',
          });
        }
      }
      expect(random).not.toHaveBeenCalled();
    },
  );

  it('creates an HTTP logger and emits complete and invalid events', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      validateOutput: true,
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

  it('accepts generic context with the action format', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      validateOutput: true,
      eventType: 'summary-log',
      format: 'action',
      logger: output,
    });

    await logpal.event({ requestId: 'request-action' }, async () => {
      logpal.addData({ context: { operation: 'transform', customField: 1 } });
      logpal.addAction({ name: 'Data transformed' });
      if (false) {
        // @ts-expect-error Action context must be a record inferred from the Zod schema.
        logpal.addData({ context: 42 });
      }
    });

    expect(readLog(output, 'info', 1)).toEqual({
      eventType: 'summary-log',
      requestId: 'request-action',
      errors: [],
      warnings: [],
      externalCalls: [],
      actions: [
        {
          name: 'Data transformed',
          number: 1,
          timestamp: expect.any(String),
        },
      ],
      context: { operation: 'transform', customField: 1 },
    });
  });

  it('rejects Lambda-specific fields in the action format', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      validateOutput: true,
      eventType: 'summary-log',
      format: 'action',
      logger: output,
    });

    await logpal.event({ requestId: 'request-invalid-action' }, async () => {
      logpal.addData({
        // @ts-expect-error The schema does not allow unknown top-level fields.
        functionName: 'handler',
      });
    });

    expect(readLog(output, 'info', 1)).toEqual({
      eventType: 'summary-log',
      requestId: 'request-invalid-action',
      errors: [],
      warnings: [],
      externalCalls: [],
      functionName: 'handler',
      _logpal: {
        errors: [{ path: 'functionName', code: 'unrecognized_keys' }],
      },
    });
  });

  it('infers data fields from a caller-provided Zod schema', async () => {
    const output = createOutput();
    const format = z.object({
      operation: z.object({ name: z.string() }),
    });
    const logpal = new LogPal({
      validateOutput: true,
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
      validateOutput: true,
      eventType: 'summary-log',
      format: 'action',
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
      validateOutput: true,
      eventType: 'summary-log',
      format: 'action',
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
      validateOutput: true,
      eventType: 'summary-log',
      format: 'action',
      logInitialization: false,
      logger: output,
    });

    expect(() =>
      logpal.event({ requestId: 'request-after-final' }, () => {
        logpal.finalize();
        logpal.addData({ context: { operation: 'late-call' } });
      }),
    ).toThrow('Cannot modify a finalized LogPal event');

    expect(readLog(output, 'error')).toEqual({
      eventType: 'logpal-call-after-finalization',
      id: 'request-after-final',
      logpal: {
        eventType: 'summary-log',
        call: 'addData',
        data: { context: { operation: 'late-call' } },
      },
    });
  });

  it.each([true, false])(
    'applies schema parsing only when validateOutput is true (%s)',
    (validateOutput) => {
      const output = createOutput();
      const format = z.object({
        operation: z.string().transform((value) => value.toUpperCase()),
        source: z.string().default('app'),
      });
      const parse = vi.spyOn(format, 'safeParse');
      const logpal = new LogPal({
        eventType: 'custom',
        format,
        validateOutput,
        logInitialization: false,
        logger: output,
      });

      logpal.event({}, () => {
        logpal.addData({ operation: 'created' });
        logpal.finalize();
      });

      expect(output.info).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledTimes(validateOutput ? 1 : 0);
      expect(readLog(output, 'info')).toEqual({
        eventType: 'custom',
        operation: validateOutput ? 'CREATED' : 'created',
        ...(validateOutput ? { source: 'app' } : {}),
        errors: [],
        warnings: [],
        externalCalls: [],
      });
    },
  );

  it('emits incomplete data without diagnostics when validation is disabled', () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'http-request',
      format: 'httpRequest',
      validateOutput: false,
      logInitialization: false,
      logger: output,
    });

    logpal.event({}, () => {
      logpal.addData({ request: { path: '/users' } });
    });

    expect(readLog(output, 'info')).toEqual({
      eventType: 'http-request',
      request: { path: '/users' },
      errors: [],
      warnings: [],
      externalCalls: [],
    });
  });

  it.each([true, false])(
    'keeps numbered, timestamped actions when a handler rejects (validation %s)',
    async (validateOutput) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-17T12:00:00.000Z'));
      const output = createOutput();
      const logpal = new LogPal({
        eventType: 'summary-log',
        format: 'action',
        validateOutput,
        logInitialization: false,
        logger: output,
      });
      const failure = new Error('handler failed');

      await expect(
        logpal.event({}, async () => {
          logpal.addAction({
            name: 'Account loaded',
            custom: { id: 'acct-1' },
          });
          await Promise.resolve();
          vi.setSystemTime(new Date('2026-11-17T12:00:01.000Z'));
          logpal.addAction({ name: 'Account updated' });
          throw failure;
        }),
      ).rejects.toBe(failure);

      expect(output.error).toHaveBeenCalledTimes(1);
      expect(readLog(output, 'error')).toMatchObject({
        actions: [
          {
            name: 'Account loaded',
            custom: { id: 'acct-1' },
            number: 1,
            timestamp: '2026-11-17T12:00:00.000Z',
          },
          {
            name: 'Account updated',
            number: 2,
            timestamp: '2026-11-17T12:00:01.000Z',
          },
        ],
        errors: [{ type: 'unhandled-error', message: 'handler failed' }],
      });
    },
  );

  it('isolates actions and their numbering between concurrent events', async () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'summary-log',
      format: 'action',
      validateOutput: true,
      logInitialization: false,
      logger: output,
    });
    const helper = (name: string) => logpal.addAction({ name });

    await Promise.all(
      ['first', 'second'].map((requestId) =>
        logpal.event({ requestId }, async () => {
          helper(`${requestId} started`);
          await Promise.resolve();
          helper(`${requestId} finished`);
        }),
      ),
    );

    expect(output.info).toHaveBeenCalledTimes(2);
    for (const [index, requestId] of ['first', 'second'].entries()) {
      expect(readLog(output, 'info', index)).toMatchObject({
        requestId,
        actions: [
          { name: `${requestId} started`, number: 1 },
          { name: `${requestId} finished`, number: 2 },
        ],
      });
    }
  });

  it('rejects actions outside an event and after finalization', () => {
    const output = createOutput();
    const logpal = new LogPal({
      eventType: 'summary-log',
      format: 'action',
      validateOutput: true,
      logInitialization: false,
      logger: output,
    });

    expect(() => logpal.addAction({ name: 'Outside' })).toThrow(
      'No active LogPal event in this context',
    );
    expect(() =>
      logpal.event({}, () => {
        logpal.finalize();
        logpal.addAction({ name: 'Too late' });
      }),
    ).toThrow('Cannot modify a finalized LogPal event');
    expect(readLog(output, 'info')).not.toHaveProperty('actions');
    expect(readLog(output, 'error')).toMatchObject({
      eventType: 'logpal-call-after-finalization',
      logpal: { call: 'addAction', data: { name: 'Too late' } },
    });
  });
});
