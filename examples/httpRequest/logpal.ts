import LogPal from '../../src/index.js';

export const logpal = new LogPal({
  eventType: 'http-request',
  format: 'httpRequest',
  sampling: {
    error: 1,
    warn: 1,
    info: 1,
  },
});
