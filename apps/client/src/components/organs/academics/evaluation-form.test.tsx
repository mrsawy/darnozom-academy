import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import { EvaluationForm } from './evaluation-form';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vitest hoists vi.mock before module variables
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

describe('EvaluationForm', () => {
  it('offers a selector for each of the five criteria', () => {
    render(<EvaluationForm onSubmit={vi.fn()} isSubmitting={false} />);
    for (const criterion of SUPERVISION_CRITERIA) {
      expect(screen.getByLabelText(`supervision.criteria.${criterion}`)).toBeInTheDocument();
    }
  });

  it('offers a note field for each criterion and one general note', () => {
    render(<EvaluationForm onSubmit={vi.fn()} isSubmitting={false} />);
    for (const criterion of SUPERVISION_CRITERIA) {
      expect(screen.getByLabelText(`supervision.notes.${criterion}`)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('supervision.notes.general')).toBeInTheDocument();
  });

  it('starts every score at 3, the middle of the scale, rather than at an extreme', () => {
    render(<EvaluationForm onSubmit={vi.fn()} isSubmitting={false} />);
    for (const criterion of SUPERVISION_CRITERIA) {
      expect(screen.getByLabelText(`supervision.criteria.${criterion}`)).toHaveValue('3');
    }
  });

  it('prefills from an existing evaluation when editing', () => {
    render(
      <EvaluationForm
        initial={{
          commitment: 5,
          teaching: 4,
          pedagogy: 3,
          contentAdherence: 2,
          technicalQuality: 1,
          notes: { general: 'Earlier note.' },
        }}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />
    );
    expect(screen.getByLabelText('supervision.criteria.commitment')).toHaveValue('5');
    expect(screen.getByLabelText('supervision.notes.general')).toHaveValue('Earlier note.');
  });

  it('submits five integers and the notes', () => {
    const onSubmit = vi.fn();
    render(<EvaluationForm onSubmit={onSubmit} isSubmitting={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'supervision.submit' }));
    expect(onSubmit).toHaveBeenCalledWith({
      commitment: 3,
      teaching: 3,
      pedagogy: 3,
      contentAdherence: 3,
      technicalQuality: 3,
      notes: {},
    });
  });

  it('disables the button while a submission is in flight, so one click is one evaluation', () => {
    render(<EvaluationForm onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole('button', { name: 'supervision.submit' })).toBeDisabled();
  });
});
