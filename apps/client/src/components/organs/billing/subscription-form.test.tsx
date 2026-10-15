import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Currency, SubscriptionType } from '@darnozom/shared-types';
import { SubscriptionForm } from './subscription-form';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vitest hoists vi.mock
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const STUDENTS = [
  { _id: 's1', name: 'Zaid' },
  { _id: 's2', name: 'Omar' },
];

describe('SubscriptionForm', () => {
  it('offers every one of the five subscription types', () => {
    render(<SubscriptionForm students={STUDENTS} onSubmit={vi.fn()} isSubmitting={false} />);
    for (const type of Object.values(SubscriptionType)) {
      expect(screen.getByRole('option', { name: `type.${type}` })).toBeInTheDocument();
    }
  });

  it('lets exactly one student be selected for non-family types', () => {
    render(<SubscriptionForm students={STUDENTS} onSubmit={vi.fn()} isSubmitting={false} />);
    const studentSelect = screen.getByLabelText('student');
    expect(studentSelect).not.toHaveAttribute('multiple');
  });

  it('switches the student control to multi-select when FAMILY is chosen', () => {
    render(<SubscriptionForm students={STUDENTS} onSubmit={vi.fn()} isSubmitting={false} />);
    fireEvent.change(screen.getByLabelText('type'), {
      target: { value: SubscriptionType.FAMILY },
    });
    const studentSelect = screen.getByLabelText('students');
    expect(studentSelect).toHaveAttribute('multiple');
  });

  it('submits a typed amount in minor units', () => {
    const onSubmit = vi.fn();
    render(
      <SubscriptionForm
        students={STUDENTS}
        onSubmit={onSubmit}
        isSubmitting={false}
        defaultGroupId="g1"
      />
    );
    fireEvent.change(screen.getByLabelText('type'), {
      target: { value: SubscriptionType.MONTHLY },
    });
    fireEvent.change(screen.getByLabelText('student'), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: SubscriptionType.MONTHLY,
      amountMinor: 10_000,
      currency: Currency.EGP,
      items: [{ studentId: 's1', groupId: 'g1' }],
      note: undefined,
    });
  });

  it('blocks submission with amountInvalid when amount cannot be parsed', () => {
    const onSubmit = vi.fn();
    render(
      <SubscriptionForm
        students={STUDENTS}
        onSubmit={onSubmit}
        isSubmitting={false}
        defaultGroupId="g1"
      />
    );
    fireEvent.change(screen.getByLabelText('student'), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText('amount'), { target: { value: 'invalid-amount' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('amountInvalid')).toBeInTheDocument();
  });

  it('accepts zero for a full scholarship', () => {
    const onSubmit = vi.fn();
    render(
      <SubscriptionForm
        students={STUDENTS}
        onSubmit={onSubmit}
        isSubmitting={false}
        defaultGroupId="g1"
      />
    );
    fireEvent.change(screen.getByLabelText('type'), {
      target: { value: SubscriptionType.SCHOLARSHIP },
    });
    fireEvent.change(screen.getByLabelText('student'), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SubscriptionType.SCHOLARSHIP,
        amountMinor: 0,
      })
    );
  });

  it('disables the submit button while in flight', () => {
    render(<SubscriptionForm students={STUDENTS} onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
  });
});
