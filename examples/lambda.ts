const logpal = new initLogPal({
  format: 'lambda',
  sampling: {
    error: 1,
    warn: 1,
    info: 0.1,
  },
});

export const handler = (event: unknown) => {
  const logger = logpal.new({
    shouldBypassSampling: () => {
      if (
        event &&
        typeof event === 'object' &&
        'path' in event &&
        typeof event.path === 'string'
      )
        return event.path.startsWith('/example');
    },
  });

  logger.addData({
    hello: 'world',
  });

  logger.addError({
    text: 'example',
  });

  logger.finalize();
};
