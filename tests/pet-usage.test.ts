import { describe, expect, it } from 'vitest';
import type { UsageRecord } from 'cortico/core/types.ts';
import { petUsage } from '../core/pet-usage.ts';

const now = Date.parse('2026-11-04T18:00:00Z');
function record(ts: string, instance = 'selected', model = 'model-a', input: number | null = 100, output: number | null = 20): UsageRecord {
  return {
    ts, model, promptTokens: input ?? 0, completionTokens: output ?? 0,
    attempt: { origin: { instance, model }, meters: { input, output, cachedInput: 80, reasoning: 10 } },
  } as UsageRecord;
}
describe('pet usage summary', () => {
  it('separates providers and models, includes failures, and does not double count cache or reasoning', () => {
    const records = [record('2026-11-04T17:00:00Z'), record('2026-11-04T17:00:00Z', 'other'),
      record('2026-11-04T17:00:00Z', 'selected', 'model-b'),
      { ...record('2026-11-04T17:30:00Z'), outcome: 'failed' as const }];
    const result = petUsage(records, 'selected', 'model-a', 'UTC', now);
    expect(result.fiveHours).toEqual({ input: 200, output: 40, requests: 2, unknown: 0 });
    expect(petUsage(records, 'selected', 'model-b', 'UTC', now).fiveHours.requests).toBe(1);
  });
  it('uses an exact rolling five hours and excludes future, invalid and unattributed records', () => {
    const records = [record('2026-11-04T13:00:00Z'), record('2026-11-04T12:59:59Z'),
      record('2026-11-04T18:00:01Z'), record('invalid'), { ...record('2026-11-04T17:00:00Z'), attempt: undefined }];
    const result = petUsage(records, 'selected', 'model-a', 'UTC', now);
    expect(result.fiveHours.requests).toBe(1);
    expect(result.week.requests).toBe(2);
  });
  it('starts a week on local Monday after a daylight-saving transition', () => {
    const records = [record('2026-11-02T05:59:59Z'), record('2026-11-02T06:00:00Z')];
    expect(petUsage(records, 'selected', 'model-a', 'America/Chicago', now).week.requests).toBe(1);
  });
  it('keeps unknown meters visible rather than claiming a complete total', () => {
    const result = petUsage([record('2026-11-04T17:00:00Z', 'selected', 'model-a', null, 30)], 'selected', 'model-a', 'UTC', now);
    expect(result.fiveHours).toEqual({ input: 0, output: 30, requests: 1, unknown: 1 });
  });
});
