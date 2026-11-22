import test from 'node:test';
import assert from 'node:assert/strict';
import { safeEqual } from '../src/utils/security.js';

// Load the app only after NODE_ENV is set so request logging stays quiet during tests.
process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/app.js');

const server = app.listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const registerAdmin = (adminCode) =>
  fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Prof Test',
      email: 'prof-test@example.com',
      password: 'secret123',
      role: 'admin',
      adminCode,
    }),
  });

// Every request below is rejected before any database query runs, so no database is needed.

test('safeEqual: equal strings match, different or different-length strings do not', () => {
  assert.equal(safeEqual('abc123', 'abc123'), true);
  assert.equal(safeEqual('abc123', 'abc124'), false);
  assert.equal(safeEqual('short', 'a-much-longer-value'), false);
  assert.equal(safeEqual('', 'x'), false);
});

test('admin registration is disabled when ADMIN_INVITE_CODE is not configured (fail closed)', async () => {
  delete process.env.ADMIN_INVITE_CODE;
  // Even the old publicly documented default must not work any more
  const res = await registerAdmin('joineazy-prof-2026');
  assert.equal(res.status, 403);
});

test('admin registration rejects a wrong invite code', async () => {
  process.env.ADMIN_INVITE_CODE = 'correct-horse-battery';
  const res = await registerAdmin('wrong-code');
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, 'Invalid admin invite code');
});

test('admin registration rejects a missing invite code', async () => {
  process.env.ADMIN_INVITE_CODE = 'correct-horse-battery';
  const res = await registerAdmin(undefined);
  assert.equal(res.status, 403);
});

test('unknown routes return a JSON 404 and malformed JSON returns 400', async () => {
  const notFound = await fetch(`${BASE}/api/nope`);
  assert.equal(notFound.status, 404);
  assert.equal((await notFound.json()).error, 'Endpoint not found');

  const bad = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(bad.status, 400);
});

test('a body over the 100kb limit returns 413, not 500', async () => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com', password: 'x'.repeat(200000) }),
  });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error, 'Request body is too large');
});

test('protected routes require a token', async () => {
  const res = await fetch(`${BASE}/api/assignments`);
  assert.equal(res.status, 401);
});
