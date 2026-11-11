import LogPal from '../../src/index.js';

export const logpal = new LogPal({
  eventType: 'summary-log',
  format: 'lambda',
  sampling: {
    error: 1,
    warn: 1,
    info: 0.1,
  },
});
