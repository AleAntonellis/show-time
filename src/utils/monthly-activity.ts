type DatedActivity = {
  watchedOn: string;
};

export function getActivitiesForMonth<
  Activity extends DatedActivity,
>(
  activities: readonly Activity[],
  monthKey: string,
): Activity[] {
  return activities.filter(
    (activity) => activity.watchedOn.slice(0, 7) === monthKey,
  );
}

export function formatMonthKey(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return monthKey;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return monthKey;
  }
  const formatted = new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
