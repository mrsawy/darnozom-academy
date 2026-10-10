'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface QuizCompletedProps {
  /** When set, copy explains max attempts reached instead of a generic “already submitted”. */
  variant?: 'default' | 'maxAttempts';
}

export function QuizCompleted({ variant = 'default' }: QuizCompletedProps) {
  const t = useTranslations('StudentCourses.quizContent');

  const title = variant === 'maxAttempts' ? t('maxAttemptsTitle') : t('quizCompleted');
  const body = variant === 'maxAttempts' ? t('maxAttemptsBody') : t('alreadySubmitted');

  return (
    <div className="py-12 text-center">
      <div
        className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${
          variant === 'maxAttempts' ? 'bg-amber-100 text-amber-700' : 'bg-green-100'
        }`}>
        {variant === 'maxAttempts' ? (
          <AlertCircle className="h-12 w-12" />
        ) : (
          <span className="text-4xl">✓</span>
        )}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-gray-600">{body}</p>
    </div>
  );
}
