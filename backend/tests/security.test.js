import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from '../src/middleware/auth.js';

test('requireRole allows request when user has authorized role', () => {
  const middleware = requireRole('admin');
  const req = { user: { id: 'user-1', role: 'admin' } };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  middleware(req, {}, next);
  assert.equal(nextCalled, true);
});

test('requireRole rejects request with 403 when user has wrong role', () => {
  const middleware = requireRole('admin');
  const req = { user: { id: 'user-2', role: 'student' } };
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
  assert.equal(statusSent, 403);
  assert.equal(jsonSent?.error, 'Access forbidden. Insufficient permissions.');
});
