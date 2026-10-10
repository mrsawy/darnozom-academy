'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { useTranslations } from 'next-intl';

interface QuizQuestionNavProps {
  totalQuestions: number;
  currentIndex: number;
  getQuestionStatus: (index: number) => 'answered' | 'unanswered';
  onGoTo: (index: number) => void;
}

export function QuizQuestionNav({
  totalQuestions,
  currentIndex,
  getQuestionStatus,
  onGoTo,
}: QuizQuestionNavProps) {
  const t = useTranslations('StudentCourses.quizContent');

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm">{t('questions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: totalQuestions }, (_, index) => (
            <Button
              key={index}
              variant={currentIndex === index ? 'default' : 'outline'}
              size="sm"
              className={`h-10 w-10 ${getQuestionStatus(index) === 'answered' ? 'border-green-300 bg-green-100 text-green-700 hover:bg-green-200' : ''}`}
              onClick={() => onGoTo(index)}>
              {index + 1}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
