import initLogPal from '../../src/index.js';

export const logpal = new initLogPal({
  format: 'lambda',
  sampling: {
    error: 1,
    warn: 1,
    info: 0.1,
  },
});
