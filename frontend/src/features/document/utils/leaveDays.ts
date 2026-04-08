import { differenceInCalendarDays } from 'date-fns';

export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  isHalfDay: boolean
): number {
  if (isHalfDay) return 0.5;
  return differenceInCalendarDays(endDate, startDate) + 1;
}
