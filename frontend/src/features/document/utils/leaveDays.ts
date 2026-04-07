/**
 * Calculate the number of leave days between two dates.
 *
 * - If `isHalfDay` is true, always returns 0.5.
 * - Otherwise counts business days (Mon-Fri) between start and end inclusive.
 *
 * Accepts either Date objects or ISO date strings ("YYYY-MM-DD").
 */
export function calculateLeaveDays(
  startDate: string | Date,
  endDate: string | Date,
  isHalfDay: boolean = false,
): number {
  if (isHalfDay) return 0.5;

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);
  // Normalize to midnight to avoid DST issues
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);

  while (current <= endNorm) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
