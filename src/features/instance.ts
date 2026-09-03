interface LogPalInstanceParamsType {
  logger?: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

const logPalInstance = (params: LogPalInstanceParamsType = {}) => {
  const { logger = console } = params;
};

export default logPalInstance;
