'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SESSION_SCORE_MAX, SESSION_SCORE_MIN, SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import type { SupervisionNotes, SupervisionScores } from '@/lib/types/academics/academics';

const SCALE = Array.from(
  { length: SESSION_SCORE_MAX - SESSION_SCORE_MIN + 1 },
  (_, index) => SESSION_SCORE_MIN + index
);
/** The middle of the scale, so an untouched selector is not a strong claim either way. */
const DEFAULT_SCORE = 3;

export function EvaluationForm({
  initial,
  onSubmit,
  isSubmitting,
}: {
  initial?: SupervisionScores;
  onSubmit: (values: SupervisionScores) => void;
  isSubmitting: boolean;
}) {
  const t = useTranslations('Academics');
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      SUPERVISION_CRITERIA.map((criterion) => [criterion, initial?.[criterion] ?? DEFAULT_SCORE])
    )
  );
  const [notes, setNotes] = useState<SupervisionNotes>(() => initial?.notes ?? {});

  const submit = () =>
    onSubmit({
      commitment: scores.commitment,
      teaching: scores.teaching,
      pedagogy: scores.pedagogy,
      contentAdherence: scores.contentAdherence,
      technicalQuality: scores.technicalQuality,
      notes,
    });

  return (
    <div className="space-y-4">
      {SUPERVISION_CRITERIA.map((criterion) => (
        <div key={criterion} className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`score-${criterion}`}>
            {t(`supervision.criteria.${criterion}`)}
          </label>
          {/* A native select keeps the 1-5 scale readable and testable without a popover. */}
          <select
            id={`score-${criterion}`}
            aria-label={t(`supervision.criteria.${criterion}`)}
            className="w-full rounded-md border p-2"
            value={String(scores[criterion])}
            onChange={(event) =>
              setScores((prev) => ({ ...prev, [criterion]: Number(event.target.value) }))
            }>
            {SCALE.map((value) => (
              <option key={value} value={String(value)}>
                {value}
              </option>
            ))}
          </select>
          <Textarea
            aria-label={t(`supervision.notes.${criterion}`)}
            value={notes[criterion as keyof SupervisionNotes] ?? ''}
            onChange={(event) => setNotes((prev) => ({ ...prev, [criterion]: event.target.value }))}
          />
        </div>
      ))}
      <Textarea
        aria-label={t('supervision.notes.general')}
        value={notes.general ?? ''}
        onChange={(event) => setNotes((prev) => ({ ...prev, general: event.target.value }))}
      />
      <Button onClick={submit} disabled={isSubmitting}>
        {t('supervision.submit')}
      </Button>
    </div>
  );
}
