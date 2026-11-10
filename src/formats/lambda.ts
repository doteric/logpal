import { z } from 'zod';
import type { FormatLogData } from './utils/index.js';

export const lambdaFormat = z
  .object({
    functionName: z.string().optional(),
    functionVersion: z.string().optional(),
    awsRequestId: z.string().optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type LambdaLogData = FormatLogData<typeof lambdaFormat>;
