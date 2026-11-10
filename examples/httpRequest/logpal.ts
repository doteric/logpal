import initLogPal from '../../src/index.js';

export const logpal = new initLogPal({
  eventType: 'http-request',
  format: 'httpRequest',
  sampling: {
    error: 1,
    warn: 1,
    info: 1,
  },
});
