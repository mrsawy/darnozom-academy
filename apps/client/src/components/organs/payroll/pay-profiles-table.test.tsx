import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Currency, TeacherPayModel } from '@darnozom/shared-types';
import { PayProfilesTable } from './pay-profiles-table';
import type { ITeacherPayProfile } from '@/lib/types/payroll/payroll';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const PROFILE: ITeacherPayProfile = {
  _id: 'prof-1',
  organizationId: 'org-1',
  teacherId: 'teacher-1',
  model: TeacherPayModel.PER_SESSION,
  rate: 50,
  currency: Currency.SAR,
  effectiveFrom: '2026-10-01T00:00:00.000Z',
};

describe('PayProfilesTable', () => {
  it('renders loading state when isLoading is true', () => {
    render(<PayProfilesTable profiles={[]} isLoading onEditProfile={vi.fn()} />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders empty state when profiles array is empty', () => {
    render(<PayProfilesTable profiles={[]} isLoading={false} onEditProfile={vi.fn()} />);
    expect(screen.getByText('emptyProfiles')).toBeInTheDocument();
  });

  it('renders profiles and triggers onEditProfile when Edit button clicked', () => {
    const onEdit = vi.fn();
    render(<PayProfilesTable profiles={[PROFILE]} isLoading={false} onEditProfile={onEdit} />);

    expect(screen.getByText('teacher-1')).toBeInTheDocument();
    expect(screen.getByText('models.PER_SESSION')).toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: 'editProfile' });
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(PROFILE);
  });
});
