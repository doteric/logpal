import { performance } from 'node:perf_hooks';
import { logpal } from './logpal.js';

export interface HttpRequestInput {
  requestId: string;
  path: string;
  method: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export interface HttpResponseOutput {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export const handleHttpRequest = async (
  request: HttpRequestInput,
  handle: () => Promise<HttpResponseOutput>,
): Promise<HttpResponseOutput> =>
  logpal.event({ requestId: request.requestId }, async () => {
    const startedAt = performance.now();
    logpal.addData({
      request: {
        path: request.path,
        method: request.method,
        headers: request.headers,
        query: request.query,
      },
    });

    // Create this before the downstream request so it is logged even if it hangs.
    const logpalExternalCall = logpal.initExternalCall({
      url: 'https://accounts.example.com',
      method: 'POST',
    });
    const response = await handle();
    logpalExternalCall.finish({
      statusCode: response.statusCode,
      custom: { source: 'accounts-service' },
    });

    logpal.addData({
      response: {
        statusCode: response.statusCode,
        durationMs: performance.now() - startedAt,
        headers: response.headers,
      },
    });
    return response;
  });
