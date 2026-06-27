import { addDays, format, isAfter, isBefore, parseISO } from 'date-fns';

export type ScheduledDose = {
  date: Date;
  dateKey: string;
  timeKey: string;
  isoKey: string;
};

export function buildIsoKey(date: Date): string {
  return `${format(date, 'yyyy-MM-dd')}T${format(date, 'HH:mm')}`;
}

export function parseReminderTimes(reminder_time: string): string[] {
  return reminder_time
    .split(',')
    .map((t) => t.trim())
    .filter((t) => /^\d{2}:\d{2}$/.test(t));
}

/**
 * Expand a medication schedule into concrete dose datetimes inside [rangeStart, rangeEnd].
 * `reminder_time` can be a single "HH:mm" or comma-separated multi e.g. "09:00,21:00".
 */
export function expandSchedule(
  start_date: string,
  reminder_time: string,
  interval_days: number,
  rangeStart: Date,
  rangeEnd: Date
): ScheduledDose[] {
  const times = parseReminderTimes(reminder_time);
  if (times.length === 0) return [];
  const step = Math.max(1, interval_days);
  const out: ScheduledDose[] = [];
  const startBase = parseISO(start_date);

  for (const time of times) {
    const [hh, mm] = time.split(':').map((v) => Number(v));
    const startDay = new Date(startBase);
    startDay.setHours(hh, mm, 0, 0);

    let cursor = new Date(startDay);
    if (isBefore(cursor, rangeStart)) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.ceil((rangeStart.getTime() - cursor.getTime()) / msPerDay);
      const stepsToSkip = Math.max(0, Math.ceil(diffDays / step));
      cursor = addDays(cursor, stepsToSkip * step);
      while (isBefore(cursor, rangeStart)) {
        cursor = addDays(cursor, step);
      }
    }

    while (!isAfter(cursor, rangeEnd)) {
      out.push({
        date: new Date(cursor),
        dateKey: format(cursor, 'yyyy-MM-dd'),
        timeKey: format(cursor, 'HH:mm'),
        isoKey: buildIsoKey(cursor),
      });
      cursor = addDays(cursor, step);
    }
  }

  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}
