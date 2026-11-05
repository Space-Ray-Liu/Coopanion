/** Local calendar entries, persisted beside alarms and available through the coopanion World. */
import { COOPANION_CALENDAR_TOOL_DECLS } from './model-text.ts';
import type { ToolDef } from 'cortico/core/types.ts';
import { asRecord, field, isRecord, readState, writeState } from './state-file.ts';

export interface CalendarEntry {
  id: string;
  title: string;
  /** Local Gregorian date or date and time in the deployment time zone. */
  start: string;
  /** Inclusive end date for all-day entries; end time for timed entries. */
  end: string;
  allDay: boolean;
}
interface Saved { next: number; events: CalendarEntry[] }

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && validDate(value.slice(0, 10));
}
function validEntry(value: unknown): value is CalendarEntry {
  if (!isRecord(value)) return false;
  const valid = value.allDay === true ? validDate : value.allDay === false ? validTime : () => false;
  return typeof value.id === 'string' && typeof value.title === 'string' && !!value.title.trim()
    && valid(value.start) && valid(value.end) && String(value.end) >= String(value.start);
}
function restore(value: unknown): Saved {
  const record = asRecord(value);
  return {
    next: field(record, 'next', (v): v is number => Number.isSafeInteger(v) && (v as number) > 0),
    events: field(record, 'events', (v): v is CalendarEntry[] => Array.isArray(v) && v.every(validEntry)),
  };
}


export class CoopanionCalendar {
  private saved: Saved;
  constructor(private readonly file: string, private readonly timezone: string) {
    this.saved = readState(file, restore) ?? { next: 1, events: [] };
  }
  list(): CalendarEntry[] {
    return this.saved.events.map((event) => ({ ...event })).sort((a, b) => a.start.localeCompare(b.start));
  }
  private save(next: Saved): void {
    writeState(this.file, `${JSON.stringify(next, null, 2)}\n`);
    this.saved = next;
  }
  set(args: Record<string, unknown>): CalendarEntry {
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const allDay = validDate(args.start);
    const valid = allDay ? validDate : validTime;
    const end = args.end ?? args.start;
    if (!title || !valid(args.start) || !valid(end) || String(end) < String(args.start)) {
      throw new Error('Give a nonempty title and valid start/end in the same format: YYYY-MM-DD or YYYY-MM-DDTHH:MM; end must not precede start.');
    }
    const updating = args.id !== undefined;
    if (updating && !this.saved.events.some((event) => event.id === args.id)) throw new Error('No calendar entry with that id.');
    const event: CalendarEntry = { id: updating ? String(args.id) : `c${this.saved.next}`, title, start: String(args.start), end: String(end), allDay };
    this.save({ next: this.saved.next + (updating ? 0 : 1), events: [...this.saved.events.filter((item) => item.id !== event.id), event] });
    return { ...event };
  }
  delete(id: unknown): CalendarEntry {
    const event = this.saved.events.find((item) => item.id === id);
    if (!event) throw new Error('No calendar entry with that id.');
    this.save({ ...this.saved, events: this.saved.events.filter((item) => item.id !== id) });
    return { ...event };
  }
  tools(): ToolDef[] {
    const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
      coopanion_calendar_set: (args) => ({ timezone: this.timezone, event: this.set(args) }),
      coopanion_calendar_delete: (args) => ({ deleted: this.delete(args.id) }),
      coopanion_calendar_list: (args) => {
        if ((args.from !== undefined && !validDate(args.from)) || (args.to !== undefined && !validDate(args.to))
          || (typeof args.from === 'string' && typeof args.to === 'string' && args.from > args.to)) throw new Error('from/to must be ordered YYYY-MM-DD dates.');
        return { timezone: this.timezone, events: this.list().filter((event) =>
          (typeof args.from !== 'string' || event.end.slice(0, 10) >= args.from)
          && (typeof args.to !== 'string' || event.start.slice(0, 10) <= args.to)) };
      },
    };
    return COOPANION_CALENDAR_TOOL_DECLS.map((decl) => ({ ...decl, handler: async (args) => {
      try { return { text: JSON.stringify(handlers[decl.name]!(args)) }; }
      catch (error) { return { text: error instanceof Error ? error.message : String(error), failed: true }; }
    } }));
  }
}
