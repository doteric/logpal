import { logpal } from './logpal.js';
import { handleRequest } from './operations.js';

const shouldBypassSampling = (event: unknown) =>
  event !== null &&
  typeof event === 'object' &&
  'path' in event &&
  typeof event.path === 'string' &&
  event.path.startsWith('/example');

export const handler = (event: unknown) => {
  return logpal.event(
    {
      shouldBypassSampling: () => shouldBypassSampling(event),
    },
    async () => {
      handleRequest();
    },
  );
};
