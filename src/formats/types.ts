import type { z } from 'zod';

type DeepPartial<Value> = Value extends readonly (infer Item)[]
  ? DeepPartial<Item>[]
  : Value extends object
    ? { [Key in keyof Value]?: DeepPartial<Value[Key]> }
    : Value;

export type FormatLogData<Format extends z.ZodType> = DeepPartial<
  z.input<Format>
>;
