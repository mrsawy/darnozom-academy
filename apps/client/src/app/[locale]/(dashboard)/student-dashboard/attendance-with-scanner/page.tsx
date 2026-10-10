import { getTranslations } from 'next-intl/server';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { StudentAttendanceCode } from './__components/student-attendance-code/student-attendance-code';

export default async function AttendanceWithScannerPage() {
  const t = await getTranslations('AttendanceWithScanner');
  const user = await getAuthUser();

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      {user ? (
        <StudentAttendanceCode
          email={user.email}
          firstName={user.firstName}
          lastName={user.lastName}
        />
      ) : (
        <p className="text-muted-foreground text-sm">{t('noUser')}</p>
      )}
    </div>
  );
}
