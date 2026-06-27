import { addDays, addMonths, format, getDay, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';

import type { Medication } from '@/db/queries';

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

function expandMonthly(
  start_date: string,
  reminder_time: string,
  monthly_day: number,
  rangeStart: Date,
  rangeEnd: Date
): ScheduledDose[] {
  const times = parseReminderTimes(reminder_time);
  if (times.length === 0) return [];
  const out: ScheduledDose[] = [];
  const startDay = parseISO(start_date);

  let cursor = new Date(startDay.getFullYear(), startDay.getMonth(), 1);
  const rangeStartMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor < rangeStartMonth) {
    cursor = addMonths(cursor, 1);
  }
  while (cursor <= rangeEnd) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(monthly_day, lastDay);
    for (const time of times) {
      const [hh, mm] = time.split(':').map(Number);
      const dose = new Date(year, month, day, hh, mm, 0, 0);
      if (dose >= rangeStart && dose <= rangeEnd && dose >= startDay) {
        out.push({
          date: dose,
          dateKey: format(dose, 'yyyy-MM-dd'),
          timeKey: format(dose, 'HH:mm'),
          isoKey: buildIsoKey(dose),
        });
      }
    }
    cursor = addMonths(cursor, 1);
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}

function expandWeekly(
  start_date: string,
  reminder_time: string,
  weekly_days: string,
  rangeStart: Date,
  rangeEnd: Date
): ScheduledDose[] {
  const times = parseReminderTimes(reminder_time);
  if (times.length === 0) return [];
  const days = new Set(
    weekly_days
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
  );
  if (days.size === 0) return [];

  const out: ScheduledDose[] = [];
  const startDay = parseISO(start_date);
  let cursor = startOfDay(new Date(Math.max(rangeStart.getTime(), startDay.getTime())));

  while (cursor <= rangeEnd) {
    if (days.has(getDay(cursor))) {
      for (const time of times) {
        const [hh, mm] = time.split(':').map(Number);
        const dose = new Date(cursor);
        dose.setHours(hh, mm, 0, 0);
        if (dose >= rangeStart && dose <= rangeEnd && dose >= startDay) {
          out.push({
            date: dose,
            dateKey: format(dose, 'yyyy-MM-dd'),
            timeKey: format(dose, 'HH:mm'),
            isoKey: buildIsoKey(dose),
          });
        }
      }
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function expandScheduleForMedication(
  med: Pick<
    Medication,
    | 'schedule_type'
    | 'monthly_day'
    | 'weekly_days'
    | 'start_date'
    | 'reminder_time'
    | 'interval_days'
  >,
  rangeStart: Date,
  rangeEnd: Date
): ScheduledDose[] {
  if (med.schedule_type === 'monthly' && med.monthly_day != null) {
    return expandMonthly(
      med.start_date,
      med.reminder_time,
      med.monthly_day,
      rangeStart,
      rangeEnd
    );
  }
  if (med.schedule_type === 'weekly' && med.weekly_days) {
    return expandWeekly(
      med.start_date,
      med.reminder_time,
      med.weekly_days,
      rangeStart,
      rangeEnd
    );
  }
  return expandSchedule(
    med.start_date,
    med.reminder_time,
    med.interval_days,
    rangeStart,
    rangeEnd
  );
}
