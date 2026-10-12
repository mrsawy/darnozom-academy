'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import {
  useCourseOptions,
  useLinkCourse,
  useProgram,
  useProgramCourses,
  useUnlinkCourse,
} from '@/lib/hooks/academics/use-academics.hook';
import { CourseLevels } from './course-levels';

export function ProgramDetail({ programId }: { programId: string }) {
  const t = useTranslations('Academics');
  const { data: program } = useProgram(programId);
  const { data: courses = [] } = useProgramCourses(programId);
  const { data: options = [] } = useCourseOptions();
  const linkCourse = useLinkCourse();
  const unlinkCourse = useUnlinkCourse();
  const [courseId, setCourseId] = useState('');
  const linkable = options.filter((option) => option.programId !== programId);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">{program?.name ?? t('loading')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('programs.courses')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder={t('programs.selectCourse')} />
              </SelectTrigger>
              <SelectContent>
                {linkable.map((course) => (
                  <SelectItem key={course._id} value={course._id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!courseId || linkCourse.isPending}
              onClick={() =>
                linkCourse.mutate({ programId, courseId }, { onSuccess: () => setCourseId('') })
              }>
              {t('programs.linkCourse')}
            </Button>
          </div>
          {courses.length === 0 ? <p className="text-muted-foreground">{t('empty')}</p> : null}
          {courses.map((course) => (
            <div key={course._id} className="space-y-3 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{course.name}</h2>
                <Button variant="outline" size="sm" onClick={() => unlinkCourse.mutate(course._id)}>
                  {t('programs.unlink')}
                </Button>
              </div>
              <CourseLevels courseId={course._id} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
