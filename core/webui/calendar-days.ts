/** Gregorian date keys in the deployment time zone, shared by the calendar and its tests. */
import type { Alarm } from '../alarms.ts';

export function dateKey(timezone: string, ms: number): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(ms).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Daily alarms appear from their next pending date onward; completed reminders are not retained. */
export function alarmsOnDay(alarms: Alarm[], timezone: string, day: string): Alarm[] {
  return alarms.filter((alarm) => {
    const first = dateKey(timezone, alarm.at);
    return alarm.daily ? day >= first : day === first;
  });
}

/** Entries intersecting this local date; all-day end dates are inclusive. */
export function eventsOnDay(events: import('../calendar.ts').CalendarEntry[], day: string) {
  return events.filter((event) => event.start.slice(0, 10) <= day && event.end.slice(0, 10) >= day);
}
