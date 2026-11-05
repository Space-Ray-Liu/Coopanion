/** Tool contracts for the coopanion World, read by the model. */
import type { ToolDef } from 'cortico/core/types.ts';

const properties = {
  title: { type: 'string', description: 'The calendar entry title.' },
  start: { type: 'string', description: 'YYYY-MM-DD for an all-day event, or YYYY-MM-DDTHH:MM for a timed event, in the deployment time zone.' },
  end: { type: 'string', description: 'Same format as start. Inclusive last day for an all-day event (e.g. start 2026-11-18 and end 2026-11-19 covers both exam days). Defaults to start.' },
};
export const COOPANION_CALENDAR_TOOL_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'coopanion_calendar_set', tags: ['write'],
    description: 'Create or update an entry in Coopanion’s built-in calendar directly, without computer use or screen access. Use this when the person asks to add dates, exams, appointments or plans to this calendar. Date-only values create all-day entries; full local date-times create timed entries. Resolve ambiguous dates with the person. Entries remain after their dates pass and across restarts. This records a plan; to wake yourself to remind the person, also use alarm_set. This does not sync external calendars.',
    parameters: { type: 'object', properties: { ...properties, id: { type: 'string', description: 'Existing entry id to update; omit to create.' } }, required: ['title', 'start'] },
  },
  {
    name: 'coopanion_calendar_list', tags: ['read'],
    description: 'Read entries from Coopanion’s built-in calendar, including their ids for editing or deleting. No computer-use permission is needed.',
    parameters: { type: 'object', properties: {
      from: { type: 'string', description: 'Optional first date, YYYY-MM-DD, inclusive.' },
      to: { type: 'string', description: 'Optional last date, YYYY-MM-DD, inclusive.' },
    } },
  },
  {
    name: 'coopanion_calendar_delete', tags: ['write'],
    description: 'Delete one entry from Coopanion’s built-in calendar by its id. No computer-use permission is needed.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
];

