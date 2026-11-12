import { httpRequestFormat } from '../httpRequest.js';
import { actionFormat } from '../action.js';
import type { HttpRequestLogData } from '../httpRequest.js';
import type { ActionLogData } from '../action.js';
import type { z, ZodObject, ZodType } from 'zod';

export type FormatName = 'action' | 'httpRequest';
export type FormatOption = FormatName | ZodObject;

export type LogDataFor<Format extends FormatOption> = Format extends FormatName
  ? Format extends 'action'
    ? ActionLogData
    : HttpRequestLogData
  : Format extends ZodObject
    ? Partial<z.input<Format>>
    : never;

export const resolveFormat = (format: FormatOption): ZodType => {
  if (format === 'action') return actionFormat;
  if (format === 'httpRequest') return httpRequestFormat;
  return format;
};

type DeepPartial<Value> = Value extends readonly (infer Item)[]
  ? DeepPartial<Item>[]
  : Value extends object
    ? { [Key in keyof Value]?: DeepPartial<Value[Key]> }
    : Value;

export type FormatLogData<Format extends z.ZodType> = DeepPartial<
  z.input<Format>
>;
