import { getCourses } from '@/lib/actions/courses/getCourses.action';
import { AttendanceMark } from './_components/mark/attendance-mark/attendance-mark';
import { AttendanceReport } from './_components/attendance-report/attendance-report';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { getTranslations } from 'next-intl/server';

export default async function AttendancePage() {
  const coursesRes = await getCourses();
  const courses = coursesRes?.docs ?? [];
  const t = await getTranslations('AttendancePage');

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Tabs defaultValue="mark" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="mark">{t('tabs.mark')}</TabsTrigger>
          <TabsTrigger value="report">{t('tabs.report')}</TabsTrigger>
        </TabsList>
        <TabsContent value="mark" className="mt-6">
          <AttendanceMark courses={courses} />
        </TabsContent>
        <TabsContent value="report" className="mt-6">
          <AttendanceReport courses={courses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
