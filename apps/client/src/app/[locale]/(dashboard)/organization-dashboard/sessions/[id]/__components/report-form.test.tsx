import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ReportForm } from './report-form';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const people = { a: 'Amal K' };
const criteria = ['participation', 'understanding', 'behavior', 'homework'] as const;

const score = (student: string, criterion: string, value: number) => {
  const card = screen.getByRole('group', { name: `${student} — sessions.report.${criterion}` });
  fireEvent.click(within(card).getByText(String(value)));
};

describe('ReportForm', () => {
  it('needs all four scores for every student before it can be submitted', () => {
    render(
      <ReportForm
        roster={['a']}
        people={people}
        disabled={false}
        pending={false}
        submitLabel="send"
        onSubmit={vi.fn()}
      />
    );
    const submit = screen.getByText('send') as HTMLButtonElement;
    expect(submit).toBeDisabled();
    score('Amal K', 'participation', 5);
    score('Amal K', 'understanding', 4);
    score('Amal K', 'behavior', 3);
    expect(submit).toBeDisabled();
    score('Amal K', 'homework', 1);
    expect(submit).toBeEnabled();
  });

  it('submits integer scores 1–5, the trimmed notes and the class summary', () => {
    const onSubmit = vi.fn();
    render(
      <ReportForm
        roster={['a']}
        people={people}
        disabled={false}
        pending={false}
        submitLabel="send"
        onSubmit={onSubmit}
      />
    );
    criteria.forEach((criterion, index) => score('Amal K', criterion, index + 2));
    fireEvent.change(screen.getByLabelText('sessions.report.note'), {
      target: { value: ' focused ' },
    });
    fireEvent.change(screen.getByLabelText('sessions.report.summary'), {
      target: { value: ' good class ' },
    });
    fireEvent.click(screen.getByText('send'));
    expect(onSubmit).toHaveBeenCalledWith({
      evaluations: [
        {
          studentId: 'a',
          participation: 2,
          understanding: 3,
          behavior: 4,
          homework: 5,
          note: 'focused',
        },
      ],
      summary: 'good class',
    });
  });

  it('keeps the evaluation of a student who has since withdrawn when editing', () => {
    const onSubmit = vi.fn();
    render(
      <ReportForm
        roster={['a']}
        people={people}
        initial={{
          evaluations: [
            { studentId: 'a', participation: 3, understanding: 3, behavior: 3, homework: 3 },
            { studentId: 'gone', participation: 2, understanding: 2, behavior: 2, homework: 2 },
          ],
          submittedBy: 't',
          submittedAt: '2026-10-12T15:00:00Z',
        }}
        disabled={false}
        pending={false}
        submitLabel="save"
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByText('save'));
    const sent = onSubmit.mock.calls[0][0];
    expect(sent.evaluations.map((e: { studentId: string }) => e.studentId)).toEqual(['a', 'gone']);
  });
});
