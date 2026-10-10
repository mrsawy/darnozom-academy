'use client';

import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { useTranslations } from 'next-intl';

interface EnrollmentProgressDialogProps {
  enrollment: IEnrollment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export function EnrollmentProgressDialog({
  enrollment,
  open,
  onOpenChange,
}: EnrollmentProgressDialogProps) {
  const t = useTranslations('EnrollmentDataTable');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('progressDetails')}</DialogTitle>
          <DialogDescription>
            {t('studentProgressFor', { courseName: enrollment?.course?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>

        {enrollment ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">{t('overallProgress')}</span>
                <span className="font-semibold">{enrollment.progressPercentage}%</span>
              </div>
              <Progress value={enrollment.progressPercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <label htmlFor="completed-modules" className="text-sm font-medium opacity-70">
                  {t('completedModules')}
                </label>
                <p id="completed-modules" className="text-2xl font-semibold">
                  {enrollment.progress.completedModules.length}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <label htmlFor="completed-contents" className="text-sm font-medium opacity-70">
                  {t('completedContents')}
                </label>
                <p id="completed-contents" className="text-2xl font-semibold">
                  {enrollment.progress.completedContents.length}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <label htmlFor="time-spent" className="text-sm font-medium opacity-70">
                  {t('timeSpent')}
                </label>
                <p id="time-spent" className="text-2xl font-semibold">
                  {formatTime(enrollment.timeSpentMinutes)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <label htmlFor="last-accessed" className="text-sm font-medium opacity-70">
                  {t('lastAccessed')}
                </label>
                <p id="last-accessed" className="text-lg font-semibold">
                  {formatDate(enrollment.lastAccessedAt)}
                </p>
              </div>
            </div>

            {Array.isArray(enrollment.progress.quizScores) &&
              enrollment.progress.quizScores.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">{t('quizScores')}</h3>
                  <div className="space-y-2">
                    {enrollment.progress.quizScores.map((quiz, index) => (
                      <div key={quiz.quizId} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{t('quiz', { index: index + 1 })}</span>
                          <div className="flex gap-4 text-sm">
                            <span>
                              {t('score')}: <span className="font-semibold">{quiz.score}%</span>
                            </span>
                            <span>
                              {t('attempts')}:{' '}
                              <span className="font-semibold">{quiz.attempts}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
