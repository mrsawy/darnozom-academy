'use client';

import { HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function QuizNoQuestions() {
  const t = useTranslations('StudentCourses.quizContent');

  return (
    <div className="py-12 text-center">
      <HelpCircle className="mx-auto mb-4 h-24 w-24 text-gray-400" />
      <h3 className="mb-2 text-xl font-semibold">{t('noQuestionsAvailable')}</h3>
      <p className="mb-4 text-gray-600">{t('noQuestionsDescription')}</p>
    </div>
  );
}
