'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Book, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
import { ROUTE_ORG_TRAINING_COURSE } from '@/lib/data/constants/routes.constants';
import { useCourseOptions } from '@/lib/hooks/academics/use-academics.hook';
import { CreateTrainingCourseDialog } from '../../academics/programs/[id]/__components/create-training-course-dialog/create-training-course-dialog';

export function TrainingCoursesManager() {
  const t = useTranslations('Academics');
  const { data: courses = [], isLoading } = useCourseOptions();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('programs.trainingCoursesTitle')}</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t('programs.newTrainingCourse')}
        </Button>
      </header>

      {isLoading ? <LoadingState /> : null}

      {!isLoading && courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            {t('programs.trainingCoursesEmpty')}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        {courses.map((course) => (
          <Link key={course._id} href={ROUTE_ORG_TRAINING_COURSE(course._id)} className="block">
            <Card className="hover:bg-muted/40 py-0 transition-colors">
              <CardContent className="flex items-center gap-2 py-3">
                <Book className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate font-medium">{course.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <CreateTrainingCourseDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
