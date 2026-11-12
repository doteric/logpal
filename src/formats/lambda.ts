import { z } from 'zod';
import type { FormatLogData } from './utils/index.js';

// TODO: Re-think structure and implement
// TODO: THE LOG FORMAT IS NOT FINAL AND IS JUST FOR BETA VERSION
export const lambdaFormat = z
  .object({
    functionName: z.string().optional(),
    functionVersion: z.string().optional(),
    awsRequestId: z.string().optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type LambdaLogData = FormatLogData<typeof lambdaFormat>;
