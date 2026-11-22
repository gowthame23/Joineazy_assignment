import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validateBody, validateUuidParam } from '../src/middleware/validate.js';

test('validateBody passes when schema criteria are satisfied', () => {
  const schema = z.object({
    name: z.string().min(2),
  });

  const middleware = validateBody(schema);
  const req = { body: { name: 'Alice' } };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  middleware(req, {}, next);
  assert.equal(nextCalled, true);
  assert.equal(req.body.name, 'Alice');
});

test('validateBody returns 400 when schema criteria fail', () => {
  const schema = z.object({
    name: z.string().min(2),
  });

  const middleware = validateBody(schema);
  const req = { body: { name: 'A' } };
  let statusSent = null;
  let jsonSent = null;

  const res = {
    status: (code) => {
      statusSent = code;
      return {
        json: (data) => { jsonSent = data; },
      };
    },
  };

  middleware(req, res, () => {});
  assert.equal(statusSent, 400);
  assert.ok(jsonSent?.error);
});

test('validateUuidParam accepts valid UUIDv4', () => {
  const middleware = validateUuidParam('id');
  const req = { params: { id: 'a89f92e2-9b93-4a12-8874-8b63e10fa101' } };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  middleware(req, {}, next);
  assert.equal(nextCalled, true);
});

test('validateUuidParam rejects non-UUID strings with 400', () => {
  const middleware = validateUuidParam('id');
  const req = { params: { id: 'invalid-uuid-123' } };
  let statusSent = null;
  let jsonSent = null;

  const res = {
    status: (code) => {
      statusSent = code;
      return {
        json: (data) => { jsonSent = data; },
      };
    },
  };

  middleware(req, res, () => {});
  assert.equal(statusSent, 400);
  assert.equal(jsonSent?.error, 'Invalid id parameter. Must be a valid UUID.');
});
