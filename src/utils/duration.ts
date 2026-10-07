const exactHoursFormatter = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 1,
});

const HOURS_PER_DAY = 24;
const HOURS_PER_MONTH = 30 * HOURS_PER_DAY;
const HOURS_PER_YEAR = 365 * HOURS_PER_DAY;

export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0h';
  }

  let remainingHours = Math.round(minutes / 60);
  if (remainingHours === 0) {
    return '<1h';
  }

  const years = Math.floor(remainingHours / HOURS_PER_YEAR);
  remainingHours %= HOURS_PER_YEAR;
  const months = Math.floor(remainingHours / HOURS_PER_MONTH);
  remainingHours %= HOURS_PER_MONTH;
  const days = Math.floor(remainingHours / HOURS_PER_DAY);
  const hours = remainingHours % HOURS_PER_DAY;

  const parts = [
    years > 0 ? `${years}y` : null,
    months > 0 ? `${months}M` : null,
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
  ].filter((part): part is string => part != null);

  return parts.join(' ') || '0h';
}

export function formatExactHours(minutes: number): string {
  const hours =
    Number.isFinite(minutes) && minutes > 0 ? minutes / 60 : 0;
  return `${exactHoursFormatter.format(hours)} h totali`;
}
