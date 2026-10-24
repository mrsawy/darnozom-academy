'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Book, Info, Link2, Unlink } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Select,
  SelectContent,
  SelectItem,
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
} from '@/lib/hooks/academics/use-academics.hook';
import { CourseLevels } from './course-levels';
import { ConfirmButton } from './confirm-button';
import { StepHeader } from './step-header';

const STEP_KEYS = ['hierarchyStep1', 'hierarchyStep2', 'hierarchyStep3', 'hierarchyStep4'] as const;

export function ProgramDetail({ programId }: { programId: string }) {
  const t = useTranslations('Academics');
  const { data: program } = useProgram(programId);
  const { data: courses = [], isLoading } = useProgramCourses(programId);
  const { data: options = [] } = useCourseOptions();
  const linkCourse = useLinkCourse();
  const unlinkCourse = useUnlinkCourse();
  const [courseId, setCourseId] = useState('');
  const linkable = options.filter((option) => option.programId !== programId);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
      <header className="space-y-3">
        <Link
          href={ROUTE_ORG_ACADEMICS_PROGRAMS}
          className="text-muted-foreground hover:text-foreground inline-block text-sm transition-colors">
          {`← ${t('programs.title')}`}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{program?.name ?? t('loading')}</h1>
          {program?.description ? (
            <p className="text-muted-foreground mt-1 text-sm">{program.description}</p>
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
            <Select value={courseId} onValueChange={setCourseId}>
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
          </CardContent>
        </Card>

        {isLoading ? <p className="text-muted-foreground text-sm">{t('loading')}</p> : null}

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
