export const errorDetails = (error: unknown) =>
  error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const mergeLogData = (
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
) => {
  const merged = { ...current, ...incoming };

  for (const key of ['request', 'response', 'custom']) {
    if (isRecord(current[key]) && isRecord(incoming[key])) {
      merged[key] = { ...current[key], ...incoming[key] };
    }
  }

  return merged;
};
