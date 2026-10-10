'use client';

import { Badge } from '@/components/atoms/badge';
import { Card, CardHeader, CardTitle } from '@/components/atoms/card';
import { Progress } from '@/components/atoms/progress';
import { Alert, AlertDescription } from '@/components/atoms/alert';
import { Clock, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface QuizProgressHeaderProps {
  timeRemaining: number;
  showTimer: boolean;
  answeredCount: number;
  totalQuestions: number;
  formatTime: (seconds: number) => string;
}

export function QuizProgressHeader({
  timeRemaining,
  showTimer,
  answeredCount,
  totalQuestions,
  formatTime,
}: QuizProgressHeaderProps) {
  const t = useTranslations('StudentCourses.quizContent');

  return (
    <>
      {showTimer && timeRemaining <= 300 && timeRemaining > 0 ? (
        <Alert className="mb-6 border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {t('onlyRemaining', { time: formatTime(timeRemaining) })}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('quizProgress')}</CardTitle>
            <div className="flex items-center gap-4">
              {showTimer ? (
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 ${timeRemaining <= 300 ? 'border-orange-400 text-orange-700' : ''}`}>
                  <Clock className="h-3 w-3" />
                  {formatTime(timeRemaining)}
                </Badge>
              ) : null}
              <Badge variant="outline">
                {answeredCount} {t('ofAnswered', { total: totalQuestions })}
              </Badge>
            </div>
          </div>
          <Progress value={(answeredCount / totalQuestions) * 100} className="h-2" />
        </CardHeader>
      </Card>
    </>
  );
}
