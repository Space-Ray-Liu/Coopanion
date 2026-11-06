/** Token use of the selected provider connection and model, from Core's local ledger. */
import type { UsageRecord } from 'cortico/core/types.ts';
import type { PetUsageSummary } from 'cortico-world-desktop-pet';
import { localToEpoch } from './alarms.ts';

export function petUsage(records: UsageRecord[], provider: string, model: string, timezone: string, now = Date.now()): PetUsageSummary {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  const year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  const weekStart = localToEpoch(timezone, year, month, day - weekday, 0, 0);
  const window = (from: number) => {
    let input = 0, output = 0, requests = 0, unknown = 0;
    for (const record of records) {
      const origin = record.attempt?.origin;
      const time = Date.parse(record.ts);
      if (!origin || origin.instance !== provider || origin.model !== model || !Number.isFinite(time) || time < from || time > now) continue;
      requests++;
      const meters = record.attempt!.meters;
      const valid = (value: number | null): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
      if (valid(meters.input)) input += meters.input;
      if (valid(meters.output)) output += meters.output;
      if (!valid(meters.input) || !valid(meters.output)) unknown++;
    }
    return { input, output, requests, unknown };
  };
  return { provider, model, timezone, updatedAt: now, fiveHours: window(now - 5 * 3_600_000), week: window(weekStart) };
}
