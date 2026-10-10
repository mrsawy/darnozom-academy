'use client';

import { Button } from '@/components/atoms/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface QuizNavFooterProps {
  currentIndex: number;
  totalQuestions: number;
  isSubmitting: boolean;
  allAnswered: boolean;
  isRTL: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function QuizNavFooter({
  currentIndex,
  totalQuestions,
  isSubmitting,
  allAnswered,
  isRTL,
  onPrevious,
  onNext,
  onSubmit,
}: QuizNavFooterProps) {
  const t = useTranslations('StudentCourses.quizContent');

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentIndex === 0 || isSubmitting}
        className="flex flex-row!">
        {isRTL ? (
          <ChevronRight className="mr-2 h-4 w-4" />
        ) : (
          <ChevronLeft className="mr-2 h-4 w-4" />
        )}
        {t('previous')}
      </Button>

      <div className="flex gap-4">
        {currentIndex === totalQuestions - 1 ? (
          <Button onClick={onSubmit} size="lg" disabled={isSubmitting || !allAnswered}>
            {isSubmitting ? t('submitting') : t('submitQuiz')}
          </Button>
        ) : (
          <Button onClick={onNext} disabled={isSubmitting} className="flex flex-row!">
            {t('next')}
            {isRTL ? (
              <ChevronLeft className="mr-2 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
