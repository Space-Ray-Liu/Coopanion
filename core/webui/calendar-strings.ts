/** Calendar labels for the coopanion World panel. */
import type { Language } from 'cortico/core/language.ts';

const labels: Record<Language, readonly [string, string, string, string, string, string, string]> = {
  zh: ['日历', '今天', '上个月', '下个月', '当天没有提醒。', '全天', '删除事项？'],
  en: ['Calendar', 'Today', 'Previous month', 'Next month', 'No reminders on this day.', 'All day', 'Delete this event?'],
  'zh-Hant': ['日曆', '今天', '上個月', '下個月', '當天沒有提醒。', '全天', '刪除事項？'],
  ja: ['カレンダー', '今日', '前の月', '次の月', 'この日のリマインダーはありません。', '終日', 'この予定を削除しますか？'],
  ko: ['캘린더', '오늘', '이전 달', '다음 달', '이 날에는 알림이 없습니다.', '종일', '이 일정을 삭제할까요?'],
  fr: ['Calendrier', 'Aujourd’hui', 'Mois précédent', 'Mois suivant', 'Aucun rappel ce jour.', 'Toute la journée', 'Supprimer cet événement ?'],
  de: ['Kalender', 'Heute', 'Vorheriger Monat', 'Nächster Monat', 'Keine Erinnerungen an diesem Tag.', 'Ganztägig', 'Diesen Termin löschen?'],
  'es-419': ['Calendario', 'Hoy', 'Mes anterior', 'Mes siguiente', 'No hay recordatorios para este día.', 'Todo el día', '¿Eliminar este evento?'],
  'pt-BR': ['Calendário', 'Hoje', 'Mês anterior', 'Próximo mês', 'Nenhum lembrete neste dia.', 'Dia inteiro', 'Excluir este evento?'],
  it: ['Calendario', 'Oggi', 'Mese precedente', 'Mese successivo', 'Nessun promemoria per questo giorno.', 'Tutto il giorno', 'Eliminare questo evento?'],
  ru: ['Календарь', 'Сегодня', 'Предыдущий месяц', 'Следующий месяц', 'В этот день нет напоминаний.', 'Весь день', 'Удалить это событие?'],
};

export function calendarText(language: Language = 'zh') {
  const [title, today, previous, next, empty, allDay, deleteEvent] = labels[language];
  return { title, today, previous, next, empty, allDay, deleteEvent };
}
