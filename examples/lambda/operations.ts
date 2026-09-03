import { logpal } from './logpal.js';

export const addRequestData = () => {
  logpal.current()?.addData({
    hello: 'world',
  });
};

export const recordExampleError = () => {
  logpal.current()?.addError({
    text: 'example',
  });
};

export const handleRequest = () => {
  addRequestData();
  recordExampleError();
};
