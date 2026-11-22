import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, asyncHandler } from '../src/utils/http.js';

test('HttpError creates an error with custom status and message', () => {
  const err = new HttpError(404, 'Resource not found');
  assert.equal(err.status, 404);
  assert.equal(err.message, 'Resource not found');
  assert.equal(err.name, 'HttpError');
});

test('asyncHandler forwards rejected promise to next middleware', async () => {
  const errorToThrow = new Error('Async failure');
  const faultyHandler = async () => {
    throw errorToThrow;
  };

  const wrapped = asyncHandler(faultyHandler);

  let capturedError = null;
  const mockNext = (err) => {
    capturedError = err;
  };

  await wrapped({}, {}, mockNext);
  assert.equal(capturedError, errorToThrow);
});
