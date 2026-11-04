/** Calendar labels for the coopanion World panel. */
import type { Language } from 'cortico/core/language.ts';

const labels: Record<Language, readonly [string, string, string, string, string]> = {
  zh: ['日历', '今天', '上个月', '下个月', '当天没有提醒。'],
  en: ['Calendar', 'Today', 'Previous month', 'Next month', 'No reminders on this day.'],
  'zh-Hant': ['日曆', '今天', '上個月', '下個月', '當天沒有提醒。'],
  ja: ['カレンダー', '今日', '前の月', '次の月', 'この日のリマインダーはありません。'],
  ko: ['캘린더', '오늘', '이전 달', '다음 달', '이 날에는 알림이 없습니다.'],
  fr: ['Calendrier', 'Aujourd’hui', 'Mois précédent', 'Mois suivant', 'Aucun rappel ce jour.'],
  de: ['Kalender', 'Heute', 'Vorheriger Monat', 'Nächster Monat', 'Keine Erinnerungen an diesem Tag.'],
  'es-419': ['Calendario', 'Hoy', 'Mes anterior', 'Mes siguiente', 'No hay recordatorios para este día.'],
  'pt-BR': ['Calendário', 'Hoje', 'Mês anterior', 'Próximo mês', 'Nenhum lembrete neste dia.'],
  it: ['Calendario', 'Oggi', 'Mese precedente', 'Mese successivo', 'Nessun promemoria per questo giorno.'],
  ru: ['Календарь', 'Сегодня', 'Предыдущий месяц', 'Следующий месяц', 'В этот день нет напоминаний.'],
};

export function calendarText(language: Language = 'zh') {
  const [title, today, previous, next, empty] = labels[language];
  return { title, today, previous, next, empty };
}
