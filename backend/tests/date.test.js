import test from 'node:test';
import assert from 'node:assert/strict';
import { isPastDate, daysUntil, formatISODate } from '../src/utils/date.js';

test('isPastDate correctly identifies past vs future dates', () => {
  const yesterday = new Date(Date.now() - 86400000);
  const tomorrow = new Date(Date.now() + 86400000);

  assert.equal(isPastDate(yesterday), true);
  assert.equal(isPastDate(tomorrow), false);
});

test('daysUntil returns correct day difference', () => {
  const future3Days = new Date(Date.now() + 3 * 86400000 + 1000);
  assert.equal(daysUntil(future3Days), 4);
});

test('formatISODate returns valid ISO-8601 string', () => {
  const date = new Date('2026-11-24T10:30:00.000Z');
  assert.equal(formatISODate(date), '2026-11-24T10:30:00.000Z');
});
