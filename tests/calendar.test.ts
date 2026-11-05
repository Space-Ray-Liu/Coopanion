import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ToolOutcome } from 'cortico/core/types.ts';
import { CoopanionCalendar } from '../core/calendar.ts';
import { eventsOnDay } from '../core/webui/calendar-days.ts';

const dirs: string[] = [];
function file() {
  const dir = mkdtempSync(join(tmpdir(), 'coo-calendar-'));
  dirs.push(dir);
  return join(dir, 'calendar.json');
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('calendar entries', () => {
  it('records both exam days and retains them after reload, without alarms or computer use', async () => {
    const path = file();
    const calendar = new CoopanionCalendar(path, 'America/Chicago');
    const set = calendar.tools().find((tool) => tool.name.endsWith('_set'))!;
    const result = (await set.handler({ title: 'Midterm exams', start: '2026-11-18', end: '2026-11-19' }, {} as never)) as ToolOutcome;
    expect(result.failed).not.toBe(true);
    const saved = new CoopanionCalendar(path, 'America/Chicago').list();
    for (const day of ['2026-11-18', '2026-11-19']) expect(eventsOnDay(saved, day).map((e) => e.title)).toEqual(['Midterm exams']);
    for (const day of ['2026-11-17', '2026-11-20']) expect(eventsOnDay(saved, day)).toEqual([]);
    expect(saved[0]?.allDay).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8')).events).toEqual(saved);
  });
  it('updates an entry by id and deletes it persistently', () => {
    const path = file();
    const calendar = new CoopanionCalendar(path, 'UTC');
    const first = calendar.set({ title: 'Study', start: '2026-11-18T09:00', end: '2026-11-18T10:00' });
    calendar.set({ id: first.id, title: 'Review', start: '2026-11-19T14:00' });
    expect(calendar.list()).toEqual([{ ...first, title: 'Review', start: '2026-11-19T14:00', end: '2026-11-19T14:00' }]);
    calendar.delete(first.id);
    expect(new CoopanionCalendar(path, 'UTC').list()).toEqual([]);
  });
  it.each([
    { title: '', start: '2026-11-18' },
    { title: 'Exam', start: '2026-02-29' },
    { title: 'Exam', start: '2026-11-31' },
    { title: 'Exam', start: '2026-11-19', end: '2026-11-18' },
    { title: 'Exam', start: '2026-11-18', end: '2026-11-19T12:00' },
    { title: 'Exam', start: '2026-11-18T25:00' },
    { title: 'Exam', start: '2026-11-18', id: 'missing' },
  ])('rejects invalid input without writing an entry: %j', async (args) => {
    const calendar = new CoopanionCalendar(file(), 'UTC');
    const result = (await calendar.tools()[0]!.handler(args, {} as never)) as ToolOutcome;
    expect(result.failed).toBe(true);
    expect(calendar.list()).toEqual([]);
  });
  it('filters date ranges by overlap and includes past entries', async () => {
    const calendar = new CoopanionCalendar(file(), 'UTC');
    const exam = calendar.set({ title: 'Exam', start: '2020-11-18', end: '2020-11-19' });
    calendar.set({ title: 'Study', start: '2020-11-20' });
    const list = calendar.tools().find((tool) => tool.name.endsWith('_list'))!;
    const result = (await list.handler({ from: '2020-11-19', to: '2020-11-19' }, {} as never)) as ToolOutcome;
    expect(JSON.parse(result.text).events).toEqual([exam]);
    expect(((await list.handler({ from: 'invalid' }, {} as never)) as ToolOutcome).failed).toBe(true);
  });
  it('leaves memory and disk unchanged when persistence fails', () => {
    const path = file();
    const calendar = new CoopanionCalendar(path, 'UTC');
    const original = calendar.set({ title: 'Study', start: '2026-11-18' });
    mkdirSync(`${path}.tmp`);
    expect(() => calendar.delete(original.id)).toThrow();
    expect(calendar.list()).toEqual([original]);
    expect(new CoopanionCalendar(path, 'UTC').list()).toEqual([original]);
  });
});
