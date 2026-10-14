import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SHARIA_MIGRATED_COMMENT,
  SHARIA_SUPERSEDED_COMMENT,
  ShariaStatus,
} from '@darnozom/shared-types';
import type { IContentVersion } from '@/lib/types/course/sharia';
import { ContentVersionsDrawer } from './content-versions-drawer';

const mockTranslate = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

vi.mock('next-intl', () => ({
  useTranslations: () => mockTranslate,
  useLocale: () => 'en',
}));

const version = (overrides: Partial<IContentVersion> = {}): IContentVersion => ({
  _id: 'v1',
  contentId: 'c1',
  courseId: 'co1',
  version: 2,
  changes: { title: 'Reworded' },
  createdBy: 'u1',
  shariaStatus: ShariaStatus.APPROVED,
  reviewedBy: 'r1',
  reviewedAt: '2026-03-11T00:00:00.000Z',
  reviewComment: null,
  createdAt: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

describe('ContentVersionsDrawer', () => {
  it('lists each version by number, newest first as given', () => {
    render(
      <ContentVersionsDrawer
        versions={[version({ version: 3 }), version({ _id: 'v0', version: 2 })]}
        isLoading={false}
      />
    );
    expect(screen.getByText('sharia.version:{"number":3}')).toBeInTheDocument();
    expect(screen.getByText('sharia.version:{"number":2}')).toBeInTheDocument();
  });

  it('is read-only: it offers no button', () => {
    render(<ContentVersionsDrawer versions={[version()]} isLoading={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('explains a superseded version in words rather than showing the raw marker', () => {
    render(
      <ContentVersionsDrawer
        versions={[
          version({
            shariaStatus: ShariaStatus.REJECTED,
            reviewComment: SHARIA_SUPERSEDED_COMMENT,
          }),
        ]}
        isLoading={false}
      />
    );
    expect(screen.getByText('sharia.superseded')).toBeInTheDocument();
    expect(screen.queryByText(SHARIA_SUPERSEDED_COMMENT)).not.toBeInTheDocument();
  });

  it('explains a migrated version in words', () => {
    render(
      <ContentVersionsDrawer
        versions={[version({ reviewComment: SHARIA_MIGRATED_COMMENT })]}
        isLoading={false}
      />
    );
    expect(screen.getByText('sharia.migrated')).toBeInTheDocument();
  });

  it('shows a reviewer’s own comment as written', () => {
    render(
      <ContentVersionsDrawer
        versions={[
          version({ shariaStatus: ShariaStatus.REJECTED, reviewComment: 'Needs a source.' }),
        ]}
        isLoading={false}
      />
    );
    expect(screen.getByText('Needs a source.')).toBeInTheDocument();
  });

  it('says so when there is no history yet', () => {
    render(<ContentVersionsDrawer versions={[]} isLoading={false} />);
    expect(screen.getByText('sharia.empty')).toBeInTheDocument();
  });
});
