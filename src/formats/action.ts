import { z } from 'zod';
import type { FormatLogData } from './utils/index.js';

export const actionFormat = z
  .object({
    context: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ActionLogData = FormatLogData<typeof actionFormat>;
