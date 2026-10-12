import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FollowUpDecision } from '@darnozom/shared-types';
import { FollowUpsCard } from './follow-ups-card';

const mutate = vi.fn();

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/lib/hooks/academics/use-academics.hook', () => ({
  useFollowUps: () => ({
    isLoading: false,
    data: {
      rows: [
        { _id: 'f1', groupId: 'g', sessionId: 's', studentId: 'stu1', decision: FollowUpDecision.CONTINUE, parentFeedback: 'happy' },
        { _id: 'f2', groupId: 'g', sessionId: 's', studentId: 'stu2' },
      ],
      people: { stu1: 'Amal K', stu2: 'Bilal R' },
    },
  }),
  useUpdateFollowUp: () => ({ mutate, isPending: false }),
}));

describe('FollowUpsCard', () => {
  it('lists every student with their recorded feedback', () => {
    render(<FollowUpsCard groupId="g" />);
    expect(screen.getByText('Amal K')).toBeTruthy();
    expect(screen.getByText('Bilal R')).toBeTruthy();
    expect((screen.getAllByLabelText('followUps.parentFeedback')[0] as HTMLTextAreaElement).value).toBe('happy');
  });

  it('saves only the fields the coordinator filled in', () => {
    render(<FollowUpsCard groupId="g" />);
    fireEvent.change(screen.getAllByLabelText('followUps.parentFeedback')[1], { target: { value: ' wants evening class ' } });
    fireEvent.click(screen.getAllByText('followUps.save')[1]);
    expect(mutate).toHaveBeenCalledWith({ id: 'f2', data: { parentFeedback: 'wants evening class' } });
  });
});
