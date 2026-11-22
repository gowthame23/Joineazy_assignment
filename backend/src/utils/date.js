/**
 * Date and timestamp utilities for Joineazy LMS
 */

export function isPastDate(date) {
  const d = new Date(date);
  return d.getTime() < Date.now();
}

export function daysUntil(date) {
  const d = new Date(date);
  const diffMs = d.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatISODate(date) {
  return new Date(date).toISOString();
}
