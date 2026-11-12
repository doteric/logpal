import LogPal from '../../src/index.js';

export const logpal = new LogPal({
  validateOutput: true,
  eventType: 'summary-log',
  format: 'action',
  sampling: {
    error: 1,
    warn: 1,
    info: 0.1,
  },
});
