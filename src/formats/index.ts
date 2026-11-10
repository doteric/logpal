import { httpRequestFormat } from './httpRequest.js';
import { lambdaFormat } from './lambda.js';
import type { HttpRequestLogData } from './httpRequest.js';
import type { LambdaLogData } from './lambda.js';
import type { z, ZodObject, ZodType } from 'zod';

const predefinedFormats = {
  lambda: lambdaFormat,
  httpRequest: httpRequestFormat,
};

export type FormatName = keyof typeof predefinedFormats;
export type FormatOption = FormatName | ZodObject;

export type LogDataFor<Format extends FormatOption> = Format extends FormatName
  ? Format extends 'lambda'
    ? LambdaLogData
    : HttpRequestLogData
  : Format extends ZodObject
    ? Partial<z.input<Format>>
    : never;

export const resolveFormat = (format: FormatOption): ZodType => {
  if (format === 'lambda') return lambdaFormat;
  if (format === 'httpRequest') return httpRequestFormat;
  return format;
};

export { httpRequestFormat, lambdaFormat };
