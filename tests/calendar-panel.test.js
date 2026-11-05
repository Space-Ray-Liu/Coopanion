import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createConsoleUi } from '../console/base/ui/index.ts';
import { calendarPanel } from '../core/webui/calendar.ts';
import { noticeDefinition } from '../core/notice.ts';
import { dateKey } from '../core/webui/calendar-days.ts';

const cleanup = [];
let dom;
let document;
beforeEach(() => { dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' }); document = dom.window.document; });
afterEach(() => { cleanup.splice(0).reverse().forEach((fn) => fn()); dom.window.close(); });

describe('Coo calendar tools and page', () => {
  it('adds both exam days through a tool with computer use off, then reads, edits and deletes the entry', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'coo-calendar-panel-'));
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
    const world = noticeDefinition({
      version: 'dev', notesDir: dir, stateFile: join(dir, 'notice.json'), alarmsFile: join(dir, 'alarms.json'),
      newInstall: () => true, read: () => undefined, petConnected: () => false, guiding: () => false,
      refreshTools: async () => {}, label: () => 'notice',
    }).create({ timezone: 'UTC' });
    const tool = (suffix, args) => world.tools().find((t) => t.name === `coopanion_calendar_${suffix}`).handler(args, {});
    const month = dateKey('UTC', Date.now()).slice(0, 7);
    const first = `${month}-18`, last = `${month}-19`;
    const result = await tool('set', { title: 'Midterm exams', start: first, end: last });
    expect(result.failed).not.toBe(true);
    const { event } = JSON.parse(result.text);
    const life = new dom.window.AbortController();
    cleanup.push(() => life.abort());
    const root = document.createElement('div');
    document.body.append(root);
    const memo = { get: (_, fallback) => fallback, set() {} };
    const ui = createConsoleUi({ doc: document, overlayHost: document.body, signal: life.signal, memo });
    let refresh;
    await calendarPanel.mount({ root, ui, language: 'en', signal: life.signal, memo,
      invoke: (method, args = []) => world.webUi('en').invoke('calendar', method, args),
      interval: (callback) => { refresh = callback; return { dispose() {} }; },
    });
    await expect.poll(() => root.querySelectorAll('.coo-calendar-day').length).toBeGreaterThan(0);
    const select = (day) => [...root.querySelectorAll('.coo-calendar-day')].find((button) => button.firstElementChild.textContent === day).click();
    for (const day of ['18', '19']) {
      select(day);
      expect(root.querySelector('.coo-calendar-detail').textContent).toContain('Midterm exams');
      expect(root.querySelector('.coo-calendar-detail').textContent).toContain('All day');
    }
    select('20');
    expect(root.querySelector('.coo-calendar-detail').textContent).not.toContain('Midterm exams');
    expect(JSON.parse((await tool('list', { from: last, to: last })).text).events).toEqual([event]);
    await tool('set', { id: event.id, title: 'Final exams', start: first, end: last });
    refresh();
    select('18');
    await expect.poll(() => root.querySelector('.coo-calendar-detail').textContent).toContain('Final exams');
    await tool('delete', { id: event.id });
    refresh();
    await expect.poll(() => root.querySelector('.coo-calendar-detail').textContent).not.toContain('Final exams');
  });
});
