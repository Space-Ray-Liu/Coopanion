import { describe, expect, it } from 'vitest';
import type { Alarm } from '../core/alarms.ts';
import { alarmsOnDay, dateKey } from '../core/webui/calendar-days.ts';

const once: Alarm = { id: 'a1', at: Date.UTC(2026, 10, 4, 1), setAt: 0, daily: false, note: 'Tea' };
const daily: Alarm = { ...once, id: 'a2', daily: true, clock: '19:00' };

describe('calendar dates', () => {
  it('groups by the deployment date across a UTC date boundary', () => {
    expect(dateKey('America/Chicago', once.at)).toBe('2026-11-03');
    expect(alarmsOnDay([once], 'America/Chicago', '2026-11-03')).toEqual([once]);
    expect(alarmsOnDay([once], 'America/Chicago', '2026-11-04')).toEqual([]);
  });
  it('projects daily reminders after their pending date across months and DST', () => {
    expect(alarmsOnDay([daily], 'America/Chicago', '2026-11-02')).toEqual([]);
    for (const day of ['2026-11-03', '2026-12-01', '2027-03-14']) {
      expect(alarmsOnDay([once, daily], 'America/Chicago', day)).toContainEqual(daily);
    }
    expect(alarmsOnDay([once, daily], 'America/Chicago', '2026-12-01')).toEqual([daily]);
  });
});
