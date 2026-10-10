import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseBreadcrumb } from './course-breadcrumb';

vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CourseBreadcrumb', () => {
  it('renders linked ancestors and current page text', () => {
    render(
      <CourseBreadcrumb
        items={[
          { label: 'Courses', href: '/organization-dashboard/courses' },
          { label: 'Algebra', href: '/organization-dashboard/courses/c1' },
          { label: 'Week 1' },
        ]}
      />
    );

    const courses = screen.getByRole('link', { name: 'Courses' });
    expect(courses).toHaveAttribute('href', '/organization-dashboard/courses');
    expect(screen.getByRole('link', { name: 'Algebra' })).toHaveAttribute(
      'href',
      '/organization-dashboard/courses/c1'
    );
    expect(screen.getByText('Week 1')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Week 1' })).not.toBeInTheDocument();
  });

  it('sets title attribute for truncated labels', () => {
    render(<CourseBreadcrumb items={[{ label: 'Very Long Course Name' }]} />);
    expect(screen.getByText('Very Long Course Name')).toHaveAttribute(
      'title',
      'Very Long Course Name'
    );
  });

  it('uses ChevronLeft separators for ar locale', async () => {
    const { useLocale } = await import('next-intl');
    vi.mocked(useLocale).mockReturnValue('ar');

    render(
      <CourseBreadcrumb
        items={[{ label: 'Courses', href: '/organization-dashboard/courses' }, { label: 'Week 1' }]}
      />
    );

    expect(screen.getByTestId('breadcrumb-chevron-rtl')).toBeInTheDocument();
    expect(screen.queryByTestId('breadcrumb-chevron-ltr')).not.toBeInTheDocument();
  });
});
