import { getTranslations } from 'next-intl/server';
import { AttendanceHistoryView } from './__components/attendance-history-view/attendance-history-view';

export default async function AttendanceHistoryPage() {
  const t = await getTranslations('AttendanceHistory');

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>
      <AttendanceHistoryView />
    </div>
  );
}
