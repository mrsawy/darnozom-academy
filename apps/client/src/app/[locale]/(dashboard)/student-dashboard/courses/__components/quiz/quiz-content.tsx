'use client';

import type { QuizIntegrityEventDto } from '@/lib/types/course/DTO/quizSubmission.dto';
import { IContent } from '@/lib/types/course/content.interface';
import { useQuizTimer } from '@/lib/hooks/course/useQuizTimer.hook';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getQuizAvailability } from './quiz-availability';
import { getQuizAttemptState } from './quiz-attempts';
import { QuizCompleted } from './quiz-completed';
import { QuizIntro } from './quiz-intro';
import { QuizNavFooter } from './quiz-nav-footer';
import { QuizNoQuestions } from './quiz-no-questions';
import { QuizProgressHeader } from './quiz-progress-header';
import { QuizQuestionNav } from './quiz-question-nav';
import { QuizQuestionPanel } from './quiz-question-panel';
import { QuizSession } from './quiz-session';
import { QuizSubmissions } from './quiz-submissions';
import { useQuizIntegrity } from '@/lib/hooks/course/content/quiz/use-quiz-integrity';
import { useSubmitQuizMutation } from '@/lib/hooks/course/content/quiz/use-quiz-submit-mutation';
import { useStudentQuizSubmissions } from '@/lib/hooks/course/content/quiz';
import { sendQuizUnloadBeacon } from '@/lib/utils/quiz/send-quiz-unload-beacon';

interface QuizContentProps {
  content: IContent;
  /** Enrollment progress flag; retakes still allowed when `maxAttempts` > 1 and attempts remain. */
  isComplete: boolean;
}

type Phase = 'intro' | 'active';

export default function QuizContent({ isComplete: _isComplete, content }: QuizContentProps) {
  const t = useTranslations('StudentCourses.quizContent');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const params = useParams();
  const enrollmentId = params.id as string;

  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isStarting, setIsStarting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const expiredAutoSubmitRef = useRef(false);
  const quizSubmittedRef = useRef(false);
  const unloadBeaconSentRef = useRef(false);
  const answersRef = useRef<Record<number, number>>({});
  const phaseRef = useRef<Phase>('intro');
  const getElapsedSecondsRef = useRef<() => number>(() => 0);
  const getIntegrityEventsRef = useRef<() => QuizIntegrityEventDto[]>(() => []);

  const { timeRemaining, isExpired, startTimer, getElapsedSeconds, clearTimer } = useQuizTimer(
    content._id,
    content.quizDurationInMinutes
  );

  const submitMutation = useSubmitQuizMutation(enrollmentId, content._id);
  const { getIntegrityEvents, resetIntegrity } = useQuizIntegrity(phase === 'active', containerRef);

  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    isError: submissionsError,
  } = useStudentQuizSubmissions(content._id);
  const { hasAttemptsLeft, attemptsLeft, attemptsUsed, maxAttempts } = getQuizAttemptState(
    content,
    submissionsData?.submissions?.length ?? 0
  );

  useEffect(() => {
    answersRef.current = answers;
    phaseRef.current = phase;
    getElapsedSecondsRef.current = getElapsedSeconds;
    getIntegrityEventsRef.current = getIntegrityEvents;
  }, [answers, phase, getElapsedSeconds, getIntegrityEvents]);

  useEffect(() => {
    const onPageHide = () => {
      if (phaseRef.current !== 'active') return;
      if (quizSubmittedRef.current) return;
      if (unloadBeaconSentRef.current) return;
      unloadBeaconSentRef.current = true;

      const formattedAnswers = Object.entries(answersRef.current).map(
        ([questionIndex, selectedOption]) => ({
          questionIndex: Number.parseInt(questionIndex, 10),
          selectedOption,
        })
      );

      const integrityEvents: QuizIntegrityEventDto[] = [
        ...getIntegrityEventsRef.current(),
        { type: 'page_unload', at: new Date().toISOString() },
      ];

      sendQuizUnloadBeacon({
        quizId: content._id,
        enrollmentId,
        answers: formattedAnswers,
        timeTakenInSeconds: getElapsedSecondsRef.current(),
        integrityEvents,
      });
    };

    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [enrollmentId, content._id]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phaseRef.current !== 'active') return;
      if (quizSubmittedRef.current) return;
      e.preventDefault();
      // Required by Chromium/Safari to show the native confirmation dialog.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const totalQuestions = content?.questions?.length ?? 0;
  const currentQuestion = content?.questions?.[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const showTimer = Boolean(content.quizDurationInMinutes) && phase === 'active';

  const availability = getQuizAvailability(new Date(), content.quizStartDate, content.quizEndDate);

  const formatTime = useCallback(
    (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (mins > 0) {
        return `${mins}${t('minutesShort')} ${secs}${t('secondsShort')}`;
      }
      return `${secs}${t('secondsShort')}`;
    },
    [t]
  );

  const handleStartQuiz = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    setIsStarting(true);
    try {
      if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen();
      }
      resetIntegrity();
      setPhase('active');
      if (content.quizDurationInMinutes) {
        clearTimer();
        startTimer();
      }
    } catch {
      toast.error(t('fullscreenDenied'));
    } finally {
      setIsStarting(false);
    }
  }, [content.quizDurationInMinutes, resetIntegrity, clearTimer, startTimer, t]);

  const handleQuizSubmit = useCallback(async () => {
    if (submitMutation.isPending) return;

    if (!content.questions || Object.keys(answers).length < content.questions.length) {
      toast.error(t('pleaseAnswerAll'));
      return;
    }

    const formattedAnswers = Object.entries(answers).map(([questionIndex, selectedOption]) => ({
      questionIndex: Number.parseInt(questionIndex, 10),
      selectedOption,
    }));

    const integrityEvents = getIntegrityEvents();

    try {
      await submitMutation.mutateAsync({
        answers: formattedAnswers,
        timeTakenInSeconds: getElapsedSeconds(),
        ...(integrityEvents.length > 0 ? { integrityEvents } : {}),
      });
      quizSubmittedRef.current = true;
      clearTimer();
    } catch {
      // toast via mutation onError
    }
  }, [
    submitMutation,
    content.questions,
    answers,
    getElapsedSeconds,
    getIntegrityEvents,
    clearTimer,
    t,
  ]);

  useEffect(() => {
    if (
      !isExpired ||
      phase !== 'active' ||
      submitMutation.isPending ||
      !hasAttemptsLeft ||
      submissionsError ||
      expiredAutoSubmitRef.current
    ) {
      return;
    }
    expiredAutoSubmitRef.current = true;
    const run = async () => {
      toast.warning(t('timeExpired'));
      const formattedAnswers = Object.entries(answers).map(([questionIndex, selectedOption]) => ({
        questionIndex: Number.parseInt(questionIndex, 10),
        selectedOption,
      }));
      const integrityEvents: QuizIntegrityEventDto[] = [
        ...getIntegrityEvents(),
        { type: 'time_expired_auto', at: new Date().toISOString() },
      ];
      try {
        await submitMutation.mutateAsync({
          answers: formattedAnswers,
          timeTakenInSeconds: getElapsedSeconds(),
          integrityEvents,
        });
        quizSubmittedRef.current = true;
        clearTimer();
      } catch {
        // toast via mutation onError
      }
    };
    void run();
  }, [
    isExpired,
    phase,
    submitMutation,
    hasAttemptsLeft,
    submissionsError,
    answers,
    getElapsedSeconds,
    getIntegrityEvents,
    clearTimer,
    t,
  ]);

  const getQuestionStatus = (index: number) =>
    answers[index] === undefined ? 'unanswered' : 'answered';

  const submissionsPanel = <QuizSubmissions quizContentId={content._id} />;

  if (!totalQuestions || !currentQuestion) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <QuizNoQuestions />
        {submissionsPanel}
      </div>
    );
  }

  if (!submissionsLoading && !submissionsError && !hasAttemptsLeft) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <QuizCompleted variant="maxAttempts" />
        {submissionsPanel}
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <QuizSession ref={containerRef} enforceFullscreen={false}>
          <QuizIntro
            content={content}
            availability={availability}
            onStart={() => void handleStartQuiz()}
            isStarting={isStarting}
            submissionsLoading={submissionsLoading}
            submissionsError={submissionsError}
            hasAttemptsLeft={hasAttemptsLeft}
            attemptsUsed={attemptsUsed}
            attemptsLeft={attemptsLeft}
            maxAttempts={maxAttempts}
          />
        </QuizSession>
        {submissionsPanel}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <QuizSession ref={containerRef} enforceFullscreen>
        <div className="container mx-auto mt-4 p-2 md:mt-32 md:p-0">
          <QuizProgressHeader
            timeRemaining={timeRemaining}
            showTimer={showTimer}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
            formatTime={formatTime}
          />

          <QuizQuestionNav
            totalQuestions={totalQuestions}
            currentIndex={currentQuestionIndex}
            getQuestionStatus={getQuestionStatus}
            onGoTo={setCurrentQuestionIndex}
          />

          <QuizQuestionPanel
            question={currentQuestion}
            questionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            selectedOption={answers[currentQuestionIndex]}
            onSelectOption={(optionIndex) =>
              setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionIndex }))
            }
          />

          <QuizNavFooter
            currentIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            isSubmitting={submitMutation.isPending}
            allAnswered={answeredCount >= totalQuestions}
            isRTL={isRTL}
            onPrevious={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
            onNext={() => setCurrentQuestionIndex((i) => Math.min(totalQuestions - 1, i + 1))}
            onSubmit={() => void handleQuizSubmit()}
          />
        </div>
      </QuizSession>
      {submissionsPanel}
    </div>
  );
}
