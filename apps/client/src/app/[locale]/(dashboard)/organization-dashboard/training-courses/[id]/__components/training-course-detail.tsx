'use client';

import { Skeleton } from '@/components/atoms/skeleton';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Network, Pencil, Trash2, Unlink, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import {
  ROUTE_ORG_ACADEMICS_PROGRAM,
  ROUTE_ORG_TRAINING_COURSES,
} from '@/lib/data/constants/routes.constants';
import {
  useDeleteTrainingCourse,
  useTrainingCourse,
  useUnlinkCourse,
  useUpdateTrainingCourse,
} from '@/lib/hooks/academics/use-academics.hook';
import { ConfirmButton } from '../../../academics/programs/[id]/__components/confirm-button';

export function TrainingCourseDetail({ courseId }: { courseId: string }) {
  const t = useTranslations('Academics');
  const router = useRouter();
  const { data: course, isLoading } = useTrainingCourse(courseId);
  const updateCourse = useUpdateTrainingCourse();
  const deleteCourse = useDeleteTrainingCourse();
  const unlinkCourse = useUnlinkCourse();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const programs = course?.programs ?? [];
  const canDelete = programs.length === 0;

  const startEdit = () => {
    setName(course?.name ?? '');
    setEditing(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header className="space-y-3">
        <Link
          href={ROUTE_ORG_TRAINING_COURSES}
          className="text-muted-foreground hover:text-foreground inline-block text-sm transition-colors">
          {`← ${t('programs.trainingCoursesTitle')}`}
        </Link>
        {editing ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateCourse.mutate(
                { id: courseId, name: name.trim() },
                { onSuccess: () => setEditing(false) }
              );
            }}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              autoFocus
              aria-label={t('programs.editName')}
            />
            <Button type="submit" size="icon" disabled={!name.trim() || updateCourse.isPending}>
              <Check className="size-4" />
              <span className="sr-only">{t('programs.save')}</span>
            </Button>
            <Button type="button" size="icon" variant="outline" onClick={() => setEditing(false)}>
              <X className="size-4" />
              <span className="sr-only">{t('cancel')}</span>
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            {course ? (
              <h1 className="text-2xl font-semibold tracking-tight">{course.name}</h1>
            ) : (
              <Skeleton className="h-8 w-56" />
            )}
            {course ? (
              <Button variant="ghost" size="icon" onClick={startEdit}>
                <Pencil className="size-4" />
                <span className="sr-only">{t('programs.editName')}</span>
              </Button>
            ) : null}
          </div>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('programs.connectedPrograms')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!isLoading && programs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('programs.noConnectedPrograms')}</p>
          ) : null}
          {programs.map((program) => (
            <div
              key={program._id}
              className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <Link
                href={ROUTE_ORG_ACADEMICS_PROGRAM(program._id)}
                className="flex min-w-0 items-center gap-2 font-medium hover:underline">
                <Network className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate">{program.name}</span>
              </Link>
              <ConfirmButton
                variant="ghost"
                size="sm"
                title={t('programs.confirmDisconnectTitle')}
                description={t('programs.confirmDisconnectHint')}
                confirmLabel={t('programs.disconnect')}
                onConfirm={() => unlinkCourse.mutate(courseId)}>
                <Unlink className="size-4" />
                {t('programs.disconnect')}
              </ConfirmButton>
            </div>
          ))}
        </CardContent>
      </Card>

      {course ? (
        <div className="flex flex-col items-start gap-2">
          <ConfirmButton
            variant="destructive"
            disabled={!canDelete || deleteCourse.isPending}
            description={t('programs.confirmDeleteTrainingCourseHint')}
            onConfirm={() =>
              deleteCourse.mutate(courseId, {
                onSuccess: () => router.push(ROUTE_ORG_TRAINING_COURSES),
              })
            }>
            <Trash2 className="size-4" />
            {t('programs.deleteTrainingCourse')}
          </ConfirmButton>
          {!canDelete ? (
            <p className="text-muted-foreground text-xs">{t('programs.deleteBlocked')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
