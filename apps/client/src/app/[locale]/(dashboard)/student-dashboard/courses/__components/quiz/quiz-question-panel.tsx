'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Label } from '@/components/atoms/label';
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group';
import type { Question } from '@/lib/types/course/content.interface';
import { useTranslations } from 'next-intl';

interface QuizQuestionPanelProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  selectedOption: number | undefined;
  onSelectOption: (optionIndex: number) => void;
}

export function QuizQuestionPanel({
  question,
  questionIndex,
  totalQuestions,
  selectedOption,
  onSelectOption,
}: QuizQuestionPanelProps) {
  const t = useTranslations('StudentCourses.quizContent');

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">
          {t('questionOf', { current: questionIndex + 1, total: totalQuestions })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <h3 className="mb-6 text-xl font-semibold">{question.questionText}</h3>
        <RadioGroup
          value={selectedOption === undefined ? '' : selectedOption.toString()}
          onValueChange={(value) => onSelectOption(Number.parseInt(value, 10))}>
          {question.options.map((option, optionIndex) => (
            <div
              key={optionIndex}
              className="flex items-center space-x-3 rounded-lg p-3 rtl:flex-row-reverse rtl:gap-4">
              <RadioGroupItem
                value={optionIndex.toString()}
                id={`option-${questionIndex}-${optionIndex}`}
              />
              <Label
                htmlFor={`option-${questionIndex}-${optionIndex}`}
                className="cursor-pointer text-base rtl:text-end">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
