import { z } from 'zod';
import type { FormatLogData } from './utils/index.js';

// TODO: Re-think structure and implement
// TODO: THE LOG FORMAT IS NOT FINAL AND IS JUST FOR BETA VERSION

export const httpRequestFormat = z
  .object({
    request: z.object({
      path: z.string(),
      method: z.string(),
      headers: z
        .record(z.string(), z.union([z.string(), z.array(z.string())]))
        .optional(),
      query: z
        .record(z.string(), z.union([z.string(), z.array(z.string())]))
        .optional(),
    }),
    response: z.object({
      statusCode: z.number(),
      durationMs: z.number(),
      headers: z
        .record(z.string(), z.union([z.string(), z.array(z.string())]))
        .optional(),
    }),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type HttpRequestLogData = FormatLogData<typeof httpRequestFormat>;
