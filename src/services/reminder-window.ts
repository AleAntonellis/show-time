const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function todayNumber(now: Date): number {
  return dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function daysUntilDate(date: string, now: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return dayNumber(year, month, day) - todayNumber(now);
}

export function isReminderWindowDay(
  daysUntil: number | null,
  windowDays: number,
): daysUntil is number {
  return daysUntil != null && daysUntil >= 0 && daysUntil <= windowDays;
}
