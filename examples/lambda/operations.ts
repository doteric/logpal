import { logpal } from './logpal.js';

// This file is only to show that you do not need to pass around the logpal instance
// You can just import the instance and use methods directly

export const addRequestData = () => {
  logpal.addData({
    context: {
      test: 'example123',
    },
  });
};

export const recordExampleError = () => {
  logpal.addError({
    text: 'example',
  });
};

export const handleRequest = () => {
  addRequestData();
  logpal.addAction({ name: 'Request data collected' });
  recordExampleError();
};
