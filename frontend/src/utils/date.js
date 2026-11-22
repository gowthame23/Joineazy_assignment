const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Counts calendar days, not 24h blocks, so "due in 3 hours" is "Due today".
// Math.round handles the 23/25h days around DST changes.
export function formatRelativeDueDate(dateString, now = new Date()) {
  const target = new Date(dateString);
  const diffDays = Math.round(
    (startOfLocalDay(target).getTime() - startOfLocalDay(now).getTime()) / MS_PER_DAY
  );

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
  }
  if (diffDays === 0) {
    return 'Due today';
  }
  if (diffDays === 1) {
    return 'Due tomorrow';
  }
  return `Due in ${diffDays} days`;
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
