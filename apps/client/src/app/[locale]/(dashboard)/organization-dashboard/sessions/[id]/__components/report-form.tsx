'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import type { ISessionEvaluation, ReportValues } from '@/lib/types/academics/academics';

const CRITERIA = ['participation', 'understanding', 'behavior', 'homework'] as const;
type Criterion = (typeof CRITERIA)[number];
type Scores = Partial<Record<Criterion, number>>;

interface EvalState {
  scores: Scores;
  note: string;
}

function buildInitialEvals(
  roster: string[],
  existing: ISessionEvaluation[]
): Map<string, EvalState> {
  const map = new Map<string, EvalState>();
  for (const id of roster) {
    const found = existing.find((e) => e.studentId === id);
    if (found) {
      const scores: Scores = {};
      for (const c of CRITERIA) scores[c] = found[c];
      map.set(id, { scores, note: found.note ?? '' });
    } else {
      map.set(id, { scores: {}, note: '' });
    }
  }
  return map;
}

function isComplete(state: EvalState): boolean {
  return CRITERIA.every((c) => state.scores[c] !== undefined);
}

export function ReportForm({
  roster,
  people,
  initial,
  disabled,
  pending,
  submitLabel,
  onSubmit,
}: {
  roster: string[];
  people: Record<string, string>;
  initial?: {
    evaluations: ISessionEvaluation[];
    submittedBy: string;
    submittedAt: string;
  };
  disabled: boolean;
  pending: boolean;
  submitLabel: string;
  onSubmit: (values: ReportValues) => void;
}) {
  const t = useTranslations('Academics');
  const [evals, setEvals] = useState<Map<string, EvalState>>(() =>
    buildInitialEvals(roster, initial?.evaluations ?? [])
  );
  const [summary, setSummary] = useState('');

  const setScore = (id: string, criterion: Criterion, value: number) =>
    setEvals((prev) => {
      const next = new Map(prev);
      const state = next.get(id)!;
      next.set(id, { ...state, scores: { ...state.scores, [criterion]: value } });
      return next;
    });

  const setNote = (id: string, note: string) =>
    setEvals((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id)!, note });
      return next;
    });

  const allComplete = roster.every((id) => isComplete(evals.get(id)!));

  const handleSubmit = () => {
    const evaluations: ISessionEvaluation[] = [];

    for (const id of roster) {
      const state = evals.get(id)!;
      const ev: ISessionEvaluation = {
        studentId: id,
        participation: state.scores.participation!,
        understanding: state.scores.understanding!,
        behavior: state.scores.behavior!,
        homework: state.scores.homework!,
      };
      const trimmed = state.note.trim();
      if (trimmed) ev.note = trimmed;
      evaluations.push(ev);
    }

    // preserve withdrawn students from initial data
    const withdrawnEvals = initial?.evaluations.filter((e) => !roster.includes(e.studentId)) ?? [];
    onSubmit({ evaluations: [...evaluations, ...withdrawnEvals], summary: summary.trim() });
  };

  return (
    <div className="space-y-6">
      {roster.map((id) => {
        const name = people[id] ?? id;
        const state = evals.get(id)!;
        return (
          <div key={id} className="space-y-3">
            <p className="font-medium">{name}</p>
            {CRITERIA.map((criterion) => (
              <fieldset
                key={criterion}
                className="space-y-1"
                aria-label={`${name} — ${t(`sessions.report.${criterion}`)}`}>
                <legend className="text-muted-foreground text-sm">
                  {t(`sessions.report.${criterion}`)}
                </legend>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={disabled}
                      aria-pressed={state.scores[criterion] === v}
                      onClick={() => setScore(id, criterion, v)}
                      className="aria-pressed:bg-primary aria-pressed:text-primary-foreground rounded border px-3 py-1 text-sm">
                      {String(v)}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <div>
              <label htmlFor={`note-${id}`} className="sr-only">
                {t('sessions.report.note')}
              </label>
              <Textarea
                id={`note-${id}`}
                aria-label={t('sessions.report.note')}
                value={state.note}
                disabled={disabled}
                onChange={(e) => setNote(id, e.target.value)}
                rows={2}
              />
            </div>
          </div>
        );
      })}
      <div>
        <label htmlFor="report-summary" className="sr-only">
          {t('sessions.report.summary')}
        </label>
        <Textarea
          id="report-summary"
          aria-label={t('sessions.report.summary')}
          value={summary}
          disabled={disabled}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
        />
      </div>
      <Button disabled={disabled || pending || !allComplete} onClick={handleSubmit}>
        {submitLabel}
      </Button>
    </div>
  );
}
