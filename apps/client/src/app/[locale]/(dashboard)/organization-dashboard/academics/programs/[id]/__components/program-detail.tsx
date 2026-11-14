'use client';

import { Skeleton } from '@/components/atoms/skeleton';
import { LoadingState } from '@/components/atoms/loading-state';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Book, Info, Link2, Plus, Unlink } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Separator } from '@/components/atoms/separator';
import { ROUTE_ORG_ACADEMICS_PROGRAMS } from '@/lib/data/constants/routes.constants';
import {
  useCourseOptions,
  useLinkCourse,
  useProgram,
  useProgramCourses,
  useUnlinkCourse,
  useUpdateProgram,
  useUpdateTrainingCourse,
} from '@/lib/hooks/academics/use-academics.hook';
import { EditFieldsDialog } from './edit-fields-dialog/edit-fields-dialog';
import { CreateTrainingCourseDialog } from './create-training-course-dialog/create-training-course-dialog';
import { CourseLevels } from './course-levels';
import { ConfirmButton } from './confirm-button';
import { StepHeader } from './step-header';

const CREATE_NEW_VALUE = '__create_new__';

const STEP_KEYS = ['hierarchyStep1', 'hierarchyStep2', 'hierarchyStep3', 'hierarchyStep4'] as const;

export function ProgramDetail({ programId }: { programId: string }) {
  const t = useTranslations('Academics');
  const { data: program } = useProgram(programId);
  const { data: courses = [], isLoading } = useProgramCourses(programId);
  const { data: options = [] } = useCourseOptions();
  const linkCourse = useLinkCourse();
  const unlinkCourse = useUnlinkCourse();
  const updateProgram = useUpdateProgram();
  const updateCourse = useUpdateTrainingCourse();
  const [courseId, setCourseId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const linkable = options.filter((option) => option.programId !== programId);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
      <header className="space-y-3">
        <Link
          href={ROUTE_ORG_ACADEMICS_PROGRAMS}
          className="text-muted-foreground hover:text-foreground inline-block text-sm transition-colors">
          {`← ${t('programs.title')}`}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {program ? (
              <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
            ) : (
              <Skeleton className="h-8 w-56" />
            )}
            {program?.description ? (
              <p className="text-muted-foreground mt-1 text-sm">{program.description}</p>
            ) : null}
          </div>
          {program ? (
            <EditFieldsDialog
              showLabel
              triggerLabel={t('programs.editProgram')}
              title={t('programs.editProgram')}
              fields={[
                { name: 'name', label: t('name'), type: 'text', required: true },
                { name: 'description', label: t('description'), type: 'textarea' },
              ]}
              values={{ name: program.name, description: program.description ?? '' }}
              pending={updateProgram.isPending}
              onSave={(v, close) =>
                updateProgram.mutate(
                  { id: programId, data: { name: v.name, description: v.description } },
                  { onSuccess: close }
                )
              }
            />
          ) : null}
        </div>
      </header>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="size-5" />
        <AlertTitle className="font-semibold">{t('programs.hierarchyDisclaimerTitle')}</AlertTitle>
        <AlertDescription className="text-muted-foreground mt-2 leading-relaxed">
          <ol className="grid gap-2 sm:grid-cols-2">
            {STEP_KEYS.map((key, index) => (
              <li key={key} className="flex items-start gap-2">
                <span className="bg-primary/15 text-primary mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <span>{t(`programs.${key}`)}</span>
              </li>
            ))}
          </ol>
        </AlertDescription>
      </Alert>

      <section className="space-y-4">
        <StepHeader
          step={1}
          icon={<Book className="size-4" />}
          title={t('programs.courses')}
          description={t('programs.coursesHint')}
          count={courses.length}
        />

        <Card>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Select
              value={courseId}
              onValueChange={(value) =>
                value === CREATE_NEW_VALUE ? setCreateOpen(true) : setCourseId(value)
              }>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder={t('programs.selectCourse')} />
              </SelectTrigger>
              <SelectContent>
                {linkable.length === 0 ? (
                  <div className="text-muted-foreground px-2 py-6 text-center text-sm">
                    {t('programs.noLinkableCourses')}
                  </div>
                ) : (
                  linkable.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      {course.name}
                    </SelectItem>
                  ))
                )}
                <SelectSeparator />
                <SelectItem
                  value={CREATE_NEW_VALUE}
                  className="text-primary focus:text-primary font-medium">
                  <Plus className="size-4" />
                  {t('programs.createNew')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={!courseId || linkCourse.isPending}
              onClick={() =>
                linkCourse.mutate({ programId, courseId }, { onSuccess: () => setCourseId('') })
              }>
              <Link2 className="size-4" />
              {t('programs.linkCourse')}
            </Button>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('programs.trainingCourse')}
            </Button>
          </CardContent>
        </Card>

        <CreateTrainingCourseDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={setCourseId}
        />

        {isLoading ? <LoadingState /> : null}

        {!isLoading && courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                <Book className="size-6" />
              </span>
              <p className="font-medium">{t('programs.emptyCoursesTitle')}</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                {t('programs.emptyCoursesHint')}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {courses.map((course) => (
            <Card key={course._id} className="gap-0 overflow-hidden py-0">
              <CardHeader className="bg-muted/40 flex flex-row items-center justify-between gap-3 space-y-0 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Book className="text-muted-foreground size-4 shrink-0" />
                  <CardTitle className="truncate text-base">{course.name}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {t('programs.courseBadge')}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                <EditFieldsDialog
                  triggerLabel={t('programs.editCourse')}
                  title={t('programs.editCourse')}
                  fields={[{ name: 'name', label: t('name'), type: 'text', required: true }]}
                  values={{ name: course.name }}
                  pending={updateCourse.isPending}
                  onSave={(v, close) =>
                    updateCourse.mutate({ id: course._id, name: v.name }, { onSuccess: close })
                  }
                />
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  title={t('programs.confirmUnlinkTitle')}
                  description={t('programs.confirmUnlinkHint')}
                  confirmLabel={t('programs.unlink')}
                  onConfirm={() => unlinkCourse.mutate(course._id)}>
                  <Unlink className="size-4" />
                  {t('programs.unlink')}
                </ConfirmButton>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="py-5">
                <CourseLevels courseId={course._id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
