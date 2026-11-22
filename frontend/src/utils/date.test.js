import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativeDueDate, formatDateTime } from './date.js';

test('formatRelativeDueDate handles today correctly', () => {
  const today = new Date().toISOString();
  assert.equal(formatRelativeDueDate(today), 'Due today');
});

test('formatRelativeDueDate handles overdue deadlines', () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  assert.equal(formatRelativeDueDate(threeDaysAgo), '3 days overdue');
});

test('formatDateTime returns formatted date string or empty string on null', () => {
  assert.equal(formatDateTime(null), '');
  const formatted = formatDateTime('2026-11-24T10:30:00.000Z');
  assert.ok(formatted.includes('2026') || formatted.includes('Nov'));
});
