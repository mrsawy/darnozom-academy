import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GroupStatus, ReadinessKey } from '@darnozom/shared-types';
import { ReadinessPanel } from './readiness-panel';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const items = (done: boolean) => Object.values(ReadinessKey).map((key) => ({ key, done }));

describe('ReadinessPanel', () => {
  it('lists all five readiness items', () => {
    render(
      <ReadinessPanel
        readiness={{ ready: false, items: items(false) }}
        status={GroupStatus.FORMING}
        contentSent={false}
        disabled={false}
        onToggleContentSent={vi.fn()}
        onMarkReady={vi.fn()}
      />
    );
    for (const key of Object.values(ReadinessKey))
      expect(screen.getByText(`readiness.items.${key}`)).toBeInTheDocument();
  });

  it('disables "Ready to start" and shows the hint while items are missing', () => {
    render(
      <ReadinessPanel
        readiness={{ ready: false, items: items(false) }}
        status={GroupStatus.FORMING}
        contentSent={false}
        disabled={false}
        onToggleContentSent={vi.fn()}
        onMarkReady={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'readiness.markReady' })).toBeDisabled();
    expect(screen.getByText('readiness.notReadyHint')).toBeInTheDocument();
  });

  it('enables "Ready to start" for a ready forming group and calls onMarkReady', () => {
    const onMarkReady = vi.fn();
    render(
      <ReadinessPanel
        readiness={{ ready: true, items: items(true) }}
        status={GroupStatus.FORMING}
        contentSent
        disabled={false}
        onToggleContentSent={vi.fn()}
        onMarkReady={onMarkReady}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'readiness.markReady' }));
    expect(onMarkReady).toHaveBeenCalledTimes(1);
  });

  it('hides the button once the group is ready to start', () => {
    render(
      <ReadinessPanel
        readiness={{ ready: true, items: items(true) }}
        status={GroupStatus.READY_TO_START}
        contentSent
        disabled={false}
        onToggleContentSent={vi.fn()}
        onMarkReady={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'readiness.markReady' })).not.toBeInTheDocument();
  });
});
