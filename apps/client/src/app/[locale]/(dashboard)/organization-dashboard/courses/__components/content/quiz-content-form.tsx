'use client';

import { useState } from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import AiGenerateQuizDialog from './ai-generate-quiz/ai-generate-quiz';

import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group';
import {
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle,
  Circle,
  GripVertical,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import Calendar05 from '@/components/molecules/date-input/calendar-05';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CourseContentFormData } from '@/lib/schema/content.schema';

// Type for quiz content specifically
type QuizContentFormData = CourseContentFormData & {
  content: {
    questions: { questionText: string; options: string[]; correctOption: number }[];
    quizStartDate: Date;
    quizEndDate: Date;
    quizDurationInMinutes: number;
    maxAttempts?: number;
  };
};

interface QuizContentFormProps {
  register: UseFormRegister<CourseContentFormData>;
  errors: FieldErrors<CourseContentFormData>;
  setValue: UseFormSetValue<CourseContentFormData>;
  watch: UseFormWatch<CourseContentFormData>;
  initialValues?: {
    questions?: { questionText: string; options: string[]; correctOption: number }[];
    quizStartDate?: string | Date;
    quizEndDate?: string | Date;
    quizDurationInMinutes?: number;
    maxAttempts?: number;
  };
}

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
}

function SortableQuestionCard({
  id,
  children,
}: {
  id: string;
  children: (handleProps: {
    ref: ((el: HTMLElement | null) => void) | undefined;
    listeners: ReturnType<typeof useSortable>['listeners'];
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}>
      {children({ ref: setActivatorNodeRef, listeners })}
    </div>
  );
}

export default function QuizContentForm({
  register,
  errors,
  setValue,
  initialValues,
}: QuizContentFormProps) {
  const t = useTranslations('CreateContentForm.quizContentForm');
  const sensors = useSensors(useSensor(PointerSensor));
  const [questions, setQuestions] = useState<Question[]>(
    initialValues?.questions?.length
      ? initialValues.questions.map((q, idx) => ({ id: String(idx + 1), ...q }))
      : [{ id: '1', questionText: '', options: ['', ''], correctOption: 0 }]
  );

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = initialValues?.quizStartDate ? new Date(initialValues.quizStartDate) : undefined;
    const to = initialValues?.quizEndDate ? new Date(initialValues.quizEndDate) : undefined;
    return (from ?? to) ? { from, to } : undefined;
  });
  const [quizDuration, setQuizDuration] = useState<number>(
    initialValues?.quizDurationInMinutes ?? 30
  );
  const [maxAttempts, setMaxAttempts] = useState<number>(initialValues?.maxAttempts ?? 1);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      questionText: '',
      options: ['', ''],
      correctOption: 0,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((q) => q.id !== questionId);
      setQuestions(updatedQuestions);
      updateFormData(updatedQuestions);
    }
  };

  const updateQuestionText = (questionId: string, text: string) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId ? { ...q, questionText: text } : q
    );
    setQuestions(updatedQuestions);
    updateFormData(updatedQuestions);
  };

  const addOption = (questionId: string) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId ? { ...q, options: [...q.options, ''] } : q
    );
    setQuestions(updatedQuestions);
    updateFormData(updatedQuestions);
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const updatedQuestions = questions.map((q) => {
      if (q.id === questionId) {
        const newOptions = q.options.filter((_, index) => index !== optionIndex);
        const newCorrectOption =
          q.correctOption >= optionIndex ? Math.max(0, q.correctOption - 1) : q.correctOption;
        return {
          ...q,
          options: newOptions,
          correctOption: newCorrectOption,
        };
      }
      return q;
    });
    setQuestions(updatedQuestions);
    updateFormData(updatedQuestions);
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId
        ? {
            ...q,
            options: q.options.map((opt, idx) => (idx === optionIndex ? value : opt)),
          }
        : q
    );
    setQuestions(updatedQuestions);
    updateFormData(updatedQuestions);
  };

  const updateCorrectOption = (questionId: string, correctIndex: number) => {
    const updatedQuestions = questions.map((q) =>
      q.id === questionId ? { ...q, correctOption: correctIndex } : q
    );
    setQuestions(updatedQuestions);
    updateFormData(updatedQuestions);
  };

  const updateFormData = (updatedQuestions: Question[]) => {
    const quizData = {
      questions: updatedQuestions.map((q) => ({
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
      })),
      quizStartDate: dateRange?.from,
      quizEndDate: dateRange?.to,
      quizDurationInMinutes: quizDuration,
      maxAttempts,
    };
    setValue('content', quizData);
  };

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);

    if (newDateRange?.to) {
      setValue('content.quizEndDate', newDateRange.to);
    }

    if (newDateRange?.from) {
      setValue('content.quizStartDate', newDateRange.from);
    }
    // Update form data with new date range
    // updateFormData(questions);
  };

  const handleDurationChange = (duration: number) => {
    setQuizDuration(duration);
    setValue('content.quizDurationInMinutes', duration);
  };

  const handleMaxAttemptsChange = (attempts: number) => {
    setMaxAttempts(attempts);
    setValue('content.maxAttempts', attempts);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex);
    setQuestions(reordered);
    updateFormData(reordered);
  };

  const handleAiGenerated = (
    generated: { questionText: string; options: string[]; correctOption: number }[]
  ) => {
    const newQuestions: Question[] = generated.map((q) => ({
      id: crypto.randomUUID(),
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctOption,
    }));
    const updated = [...questions, ...newQuestions];
    setQuestions(updated);
    updateFormData(updated);
  };

  const getQuestionError = (questionIndex: number) => {
    const contentErrors = errors.content as FieldErrors<QuizContentFormData['content']> | undefined;
    if (contentErrors && 'questions' in contentErrors && contentErrors.questions?.[questionIndex]) {
      return contentErrors.questions[questionIndex];
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <HelpCircle className="mr-2 h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quiz Settings */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="mr-2 h-5 w-5" />
              {t('quizSettings.title')}
            </CardTitle>
            <CardDescription>{t('quizSettings.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range Selection */}
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('quizSettings.dateRange.label')}</span>
              <div className="flex justify-center rounded-lg border p-4">
                <Calendar05 dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">{t('quizSettings.dateRange.start')}</span>{' '}
                  {dateRange?.from
                    ? format(dateRange.from, 'MMM dd, yyyy')
                    : t('quizSettings.dateRange.notSelected')}
                </div>
                <div>
                  <span className="font-medium">{t('quizSettings.dateRange.end')}</span>{' '}
                  {dateRange?.to
                    ? format(dateRange.to, 'MMM dd, yyyy')
                    : t('quizSettings.dateRange.notSelected')}
                </div>
              </div>
              {(() => {
                const contentErrors = errors.content as
                  | FieldErrors<QuizContentFormData['content']>
                  | undefined;
                const startDateError =
                  contentErrors && 'quizStartDate' in contentErrors
                    ? contentErrors.quizStartDate
                    : undefined;
                const endDateError =
                  contentErrors && 'quizEndDate' in contentErrors
                    ? contentErrors.quizEndDate
                    : undefined;
                return startDateError || endDateError ? (
                  <p className="flex items-center text-sm text-red-600">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    {startDateError?.message ?? endDateError?.message}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('quizSettings.duration.label')}</span>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={quizDuration}
                  onChange={(e) => handleDurationChange(Number.parseInt(e.target.value) ?? 0)}
                  min="1"
                  max="480"
                  className="w-32"
                  placeholder="30"
                />
                <span className="text-sm">{t('quizSettings.duration.minutes')}</span>
              </div>
              <p className="text-xs">
                {t('quizSettings.duration.duration', {
                  hours: Math.floor(quizDuration / 60),
                  minutes: quizDuration % 60,
                })}
              </p>
              {(() => {
                const contentErrors = errors.content as
                  | FieldErrors<QuizContentFormData['content']>
                  | undefined;
                const durationError =
                  contentErrors && 'quizDurationInMinutes' in contentErrors
                    ? contentErrors.quizDurationInMinutes
                    : undefined;
                return durationError ? (
                  <p className="flex items-center text-sm text-red-600">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    {durationError.message}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Max Attempts */}
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('quizSettings.maxAttempts.label')}</span>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) =>
                    handleMaxAttemptsChange(Math.max(1, Number.parseInt(e.target.value) || 1))
                  }
                  min="1"
                  max="20"
                  className="w-32"
                  placeholder="1"
                />
                <span className="text-sm">{t('quizSettings.maxAttempts.hint')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{t('questions.title')}</h3>
            <div className="flex items-center gap-2">
              <AiGenerateQuizDialog onGenerated={handleAiGenerated} />
              <Badge variant="outline">{t('questions.count', { count: questions.length })}</Badge>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}>
              {questions.map((question, questionIndex) => {
                const questionError = getQuestionError(questionIndex);

                return (
                  <SortableQuestionCard key={question.id} id={question.id}>
                    {({ ref: handleRef, listeners: handleListeners }) => (
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                ref={handleRef}
                                {...handleListeners}
                                className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
                                aria-label={t('dragToReorder')}>
                                <GripVertical className="h-4 w-4" />
                              </button>
                              <Badge variant="outline">
                                {t('questions.question', { number: questionIndex + 1 })}
                              </Badge>
                            </div>
                            {questions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(question.id)}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Question Text */}
                          <div className="space-y-2">
                            <span className="text-sm font-medium">
                              {t('questions.questionText.label')}
                            </span>
                            <Textarea
                              value={question.questionText}
                              onChange={(e) => updateQuestionText(question.id, e.target.value)}
                              placeholder={t('questions.questionText.placeholder')}
                              rows={3}
                              className="w-full"
                            />
                            {questionError?.questionText ? (
                              <p className="flex items-center text-sm text-red-600">
                                <AlertCircle className="mr-1 h-4 w-4" />
                                {questionError.questionText.message}
                              </p>
                            ) : null}
                          </div>

                          {/* Answer Options */}
                          <div className="space-y-3">
                            <span className="text-sm font-medium">
                              {t('questions.answerOptions.label')}
                            </span>
                            <div className="space-y-2">
                              {question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-3">
                                  <RadioGroup
                                    value={question.correctOption.toString()}
                                    onValueChange={(value) =>
                                      updateCorrectOption(question.id, Number.parseInt(value))
                                    }
                                    className="flex items-center">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem
                                        value={optionIndex.toString()}
                                        id={`${question.id}-${optionIndex}`}
                                      />
                                      <span className="cursor-pointer">
                                        {question.correctOption === optionIndex ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <Circle className="h-4 w-4" />
                                        )}
                                      </span>
                                    </div>
                                  </RadioGroup>

                                  <Input
                                    value={option}
                                    onChange={(e) =>
                                      updateOption(question.id, optionIndex, e.target.value)
                                    }
                                    placeholder={t('questions.answerOptions.option', {
                                      number: optionIndex + 1,
                                    })}
                                    className="mx-3 flex-1"
                                  />

                                  {question.options.length > 2 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeOption(question.id, optionIndex)}
                                      className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {question.options.length < 6 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(question.id)}
                                className="w-full">
                                <Plus className="mr-2 h-4 w-4" />
                                {t('questions.answerOptions.addOption')}
                              </Button>
                            )}

                            {questionError?.options ? (
                              <p className="flex items-center text-sm text-red-600">
                                <AlertCircle className="mr-1 h-4 w-4" />
                                {questionError.options.message}
                              </p>
                            ) : null}

                            {questionError?.correctOption ? (
                              <p className="flex items-center text-sm text-red-600">
                                <AlertCircle className="mr-1 h-4 w-4" />
                                {questionError.correctOption.message}
                              </p>
                            ) : null}
                          </div>

                          {/* Correct Answer Indicator */}
                          {question.correctOption >= 0 &&
                          question.options[question.correctOption] ? (
                            <div className="rounded-md border border-green-200 p-3">
                              <p className="text-sm text-green-800">
                                <strong>{t('questions.correctAnswer')}</strong>{' '}
                                {question.options[question.correctOption]}
                              </p>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    )}
                  </SortableQuestionCard>
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        {/* Add Question Button */}
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          className="w-full border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          {t('questions.addQuestion')}
        </Button>

        {/* Quiz Summary */}
        <div className="rounded-lg p-4">
          <h4 className="mb-2 font-medium">{t('summary.title')}</h4>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="font-medium">{t('summary.totalQuestions')}</span> {questions.length}
            </div>
            <div>
              <span className="font-medium">{t('summary.totalOptions')}</span>{' '}
              {questions.reduce((acc, q) => acc + q.options.length, 0)}
            </div>
            <div>
              <span className="font-medium">{t('summary.startDate')}</span>{' '}
              {dateRange?.from ? format(dateRange.from, 'MMM dd, yyyy') : t('summary.notSet')}
            </div>
            <div>
              <span className="font-medium">{t('summary.endDate')}</span>{' '}
              {dateRange?.to ? format(dateRange.to, 'MMM dd, yyyy') : t('summary.notSet')}
            </div>
            <div>
              <span className="font-medium">{t('summary.duration')}</span>{' '}
              {t('durationHoursMinutes', {
                hours: Math.floor(quizDuration / 60),
                minutes: quizDuration % 60,
              })}
            </div>
            <div>
              <span className="font-medium">{t('summary.maxPoints')}</span>{' '}
              {t(questions.length === 1 ? 'summary.point' : 'summary.points', {
                count: questions.length,
              })}
            </div>
          </div>
        </div>

        {/* Hidden inputs for form registration */}
        <input
          type="hidden"
          {...register('content.questions')}
          value={JSON.stringify(
            questions.map((q) => ({
              questionText: q.questionText,
              options: q.options,
              correctOption: q.correctOption,
            }))
          )}
        />
        <input
          type="hidden"
          {...register('content.quizStartDate')}
          value={dateRange?.from?.toISOString() ?? ''}
        />
        <input
          type="hidden"
          {...register('content.quizEndDate')}
          value={dateRange?.to?.toISOString() ?? ''}
        />
        <input type="hidden" {...register('content.quizDurationInMinutes')} value={quizDuration} />
        <input type="hidden" {...register('content.maxAttempts')} value={maxAttempts} />
      </CardContent>
    </Card>
  );
}
