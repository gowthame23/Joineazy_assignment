import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativeDueDate, formatDateTime } from './date.js';

// Fixed "now" (local time) so the tests do not depend on when they run
const NOW = new Date(2026, 10, 22, 14, 0, 0); // 22 Nov 2026, 14:00 local
const at = (dayOffset, hours, minutes = 0) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

test('formatRelativeDueDate handles today correctly', () => {
  const today = new Date().toISOString();
  assert.equal(formatRelativeDueDate(today), 'Due today');
});

test('formatRelativeDueDate handles overdue deadlines', () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  assert.equal(formatRelativeDueDate(threeDaysAgo), '3 days overdue');
});

test('due later the same day says "Due today", not "Due tomorrow"', () => {
  assert.equal(formatRelativeDueDate(at(0, 17), NOW), 'Due today'); // in 3 hours
  assert.equal(formatRelativeDueDate(at(0, 23, 59), NOW), 'Due today');
});

test('calendar-day boundaries: tomorrow, in N days, overdue', () => {
  assert.equal(formatRelativeDueDate(at(1, 0, 30), NOW), 'Due tomorrow'); // 10.5 hours away, but tomorrow
  assert.equal(formatRelativeDueDate(at(5, 12), NOW), 'Due in 5 days');
  assert.equal(formatRelativeDueDate(at(-1, 23), NOW), '1 day overdue');
  assert.equal(formatRelativeDueDate(at(-4, 9), NOW), '4 days overdue');
});

test('formatDateTime returns formatted date string or empty string on null', () => {
  assert.equal(formatDateTime(null), '');
  const formatted = formatDateTime('2026-11-24T10:30:00.000Z');
  assert.ok(formatted.includes('2026') || formatted.includes('Nov'));
});
