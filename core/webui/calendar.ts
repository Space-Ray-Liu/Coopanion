/** Month view of pending alarms through the coopanion World's panel contract. */
import type { WebUiPanel } from 'cortico/web/shared/client-panel.ts';
import type { AlarmsState } from '../notice.ts';
import { alarmsOnDay, dateKey } from './calendar-days.ts';
import { calendarText } from './calendar-strings.ts';
import { panelText } from './strings.ts';

export const calendarPanel: WebUiPanel = {
  mount(ctx) {
    const { ui } = ctx;
    const t = calendarText(ctx.language);
    const a = panelText(ctx.language);
    const sheet = ui.sheet({ title: t.title });
    ctx.root.append(sheet.el);
    const bar = ui.rowbar();
    const heading = ui.h('strong');
    const grid = ui.h('div', 'coo-calendar-grid');
    const detail = ui.h('div', 'coo-calendar-detail');
    const message = ui.msgline('');
    let state: AlarmsState | null = null;
    let month = '';
    let selected = '';
    const move = (delta: number) => {
      const [y, m] = month.split('-').map(Number);
      const day = new Date(Date.UTC(y!, m! - 1 + delta, 1));
      month = day.toISOString().slice(0, 7);
      selected = `${month}-01`;
      paint();
    };
    const prev = ui.button('‹', { onClick: () => move(-1) });
    prev.setAttribute('aria-label', t.previous);
    const next = ui.button('›', { onClick: () => move(1) });
    next.setAttribute('aria-label', t.next);
    const today = ui.button(t.today, { onClick: () => {
      if (!state) return;
      selected = dateKey(state.timezone, Date.now());
      month = selected.slice(0, 7);
      paint();
    } });
    prev.disabled = next.disabled = today.disabled = true;
    bar.append(prev, heading, next, ui.h('span', 'grow'), today);
    sheet.body.append(bar, grid, detail, message);
    const paint = () => {
      if (!state) return;
      const st = state;
      const now = dateKey(st.timezone, Date.now());
      const [year, mo] = month.split('-').map(Number);
      const first = new Date(Date.UTC(year!, mo! - 1, 1));
      heading.textContent = new Intl.DateTimeFormat(ctx.language, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(first);
      heading.title = st.timezone;
      grid.replaceChildren();
      const weekday = new Intl.DateTimeFormat(ctx.language, { weekday: 'short', timeZone: 'UTC' });
      for (let i = 0; i < 7; i++) grid.append(ui.h('div', 'coo-calendar-weekday', weekday.format(new Date(Date.UTC(2026, 5, 1 + i)))));
      const offset = (first.getUTCDay() + 6) % 7;
      const days = new Date(Date.UTC(year!, mo!, 0)).getUTCDate();
      for (let i = 0; i < offset; i++) grid.append(ui.h('div'));
      for (let d = 1; d <= days; d++) {
        const key = `${month}-${String(d).padStart(2, '0')}`;
        const matches = alarmsOnDay(st.alarms, st.timezone, key);
        const cell = ui.h('button', 'coo-calendar-day');
        cell.type = 'button';
        cell.classList.toggle('is-today', key === now);
        cell.setAttribute('aria-pressed', String(key === selected));
        if (key === now) cell.setAttribute('aria-current', 'date');
        cell.setAttribute('aria-label', new Intl.DateTimeFormat(ctx.language, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`)));
        cell.append(ui.h('span', null, String(d)));
        if (matches.length) cell.append(ui.h('span', 'coo-calendar-count', String(matches.length)));
        cell.addEventListener('click', () => { selected = key; paint(); });
        grid.append(cell);
      }
      detail.replaceChildren(ui.h('h3', null, selected), ui.h('div', 'coo-alarm-dim', st.timezone));
      const matches = alarmsOnDay(st.alarms, st.timezone, selected);
      if (!matches.length) detail.append(ui.placeholder(t.empty));
      const time = new Intl.DateTimeFormat(ctx.language, { timeZone: st.timezone, hour: '2-digit', minute: '2-digit' });
      for (const alarm of matches) {
        const item = ui.h('div', 'coo-alarm');
        const row = ui.rowbar();
        row.append(ui.h('span', 'coo-alarm-time', alarm.daily ? alarm.clock ?? time.format(alarm.at) : time.format(alarm.at)));
        if (alarm.daily) row.append(ui.h('span', 'coo-alarm-daily', a.daily));
        row.append(ui.h('span', 'grow'));
        const remove = ui.button(a.remove, { size: 'sm', onClick: async () => {
          if (!await ui.confirm({ title: a.confirmTitle(selected), body: alarm.note })) return;
          remove.disabled = true;
          try {
            state = await ctx.invoke<AlarmsState>('cancel', [alarm.id]);
            paint();
            ui.toast(a.removed);
          } catch (error) {
            remove.disabled = false;
            ui.toast(a.failed(error instanceof Error ? error.message : String(error)), 'bad');
          }
        } });
        row.append(remove);
        item.append(row, ui.h('div', 'coo-alarm-note', alarm.note));
        detail.append(item);
      }
    };
    const refresh = async () => {
      try {
        state = await ctx.invoke<AlarmsState>('list');
        if (!selected) {
          selected = dateKey(state.timezone, Date.now());
          month = selected.slice(0, 7);
        }
        prev.disabled = next.disabled = today.disabled = false;
        paint();
        message.textContent = '';
      } catch (error) { message.textContent = a.loadFailed(error instanceof Error ? error.message : String(error)); }
    };
    void refresh();
    ctx.interval(() => void refresh(), 5000);
  },
};
