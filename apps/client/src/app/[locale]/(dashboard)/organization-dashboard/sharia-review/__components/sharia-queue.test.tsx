import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { IShariaQueueItem } from '@/lib/types/course/sharia';
import { ShariaQueue } from './sharia-queue';

const mockTranslate = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

vi.mock('next-intl', () => ({
  useTranslations: () => mockTranslate,
  useLocale: () => 'en',
}));

const item = (overrides: Partial<IShariaQueueItem> = {}): IShariaQueueItem => ({
  contentId: 'c1',
  contentTitle: 'Lesson 1',
  courseId: 'co1',
  version: 2,
  createdAt: '2026-03-10T00:00:00.000Z',
  createdBy: 'u1',
  isEdit: true,
  ...overrides,
});

describe('ShariaQueue', () => {
  it('says the queue is empty when there is nothing to review', () => {
    render(<ShariaQueue items={[]} isLoading={false} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('sharia.empty')).toBeInTheDocument();
  });

  it('shows the loading state instead of the empty state while fetching', () => {
    render(<ShariaQueue items={[]} isLoading onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('sharia.loading')).toBeInTheDocument();
    expect(screen.queryByText('sharia.empty')).not.toBeInTheDocument();
  });

  it('names the content and marks an edit as an edit', () => {
    render(
      <ShariaQueue items={[item()]} isLoading={false} onApprove={vi.fn()} onReject={vi.fn()} />
    );
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    expect(screen.getByText('sharia.kind.edit')).toBeInTheDocument();
  });

  it('marks new content as new', () => {
    render(
      <ShariaQueue
        items={[item({ isEdit: false })]}
        isLoading={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('sharia.kind.new')).toBeInTheDocument();
  });

  it('approves with the content id and version', () => {
    const onApprove = vi.fn();
    render(
      <ShariaQueue items={[item()]} isLoading={false} onApprove={onApprove} onReject={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'sharia.approve' }));
    expect(onApprove).toHaveBeenCalledWith({ contentId: 'c1', version: 2 });
  });

  it('does not reject until a comment has been typed', () => {
    const onReject = vi.fn();
    render(
      <ShariaQueue items={[item()]} isLoading={false} onApprove={vi.fn()} onReject={onReject} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'sharia.reject' }));
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByText('sharia.commentRequired')).toBeInTheDocument();
  });
});
