import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MeetingProvider } from '@darnozom/shared-types';
import { SessionJoinButton } from './session-join-button';

const push = vi.fn();
const joinSession = vi.fn();
const toastError = vi.fn();

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- hoisted vi.mock factory
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('react-toastify', () => ({ toast: { error: (m: string) => toastError(m) } }));
vi.mock('@/lib/actions/academics/sessions.action', () => ({ joinSession: (id: string) => joinSession(id) }));

describe('SessionJoinButton', () => {
  let opened: { location: { href: string }; close: () => void; opener: unknown };

  beforeEach(() => {
    vi.clearAllMocks();
    opened = { location: { href: '' }, close: vi.fn(), opener: {} };
    vi.stubGlobal('open', vi.fn().mockReturnValue(opened));
  });

  it('external link: records the join first, then sends the new tab to the returned link', async () => {
    joinSession.mockResolvedValue({ provider: MeetingProvider.EXTERNAL_URL, meetingLink: 'https://meet.example/x' });
    render(<SessionJoinButton sessionId="s1" provider={MeetingProvider.EXTERNAL_URL} callHref="/call/s1" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(opened.location.href).toBe('https://meet.example/x'));
    expect(joinSession).toHaveBeenCalledWith('s1');
    expect(push).not.toHaveBeenCalled();
  });

  it('Agora: goes to the in-platform call page without opening a window or joining here', () => {
    render(<SessionJoinButton sessionId="s1" provider={MeetingProvider.AGORA} callHref="/call/s1" />);
    fireEvent.click(screen.getByRole('button'));
    expect(push).toHaveBeenCalledWith('/call/s1');
    expect(window.open).not.toHaveBeenCalled();
    expect(joinSession).not.toHaveBeenCalled();
  });

  it('shows the error and closes the blank tab when joining is refused', async () => {
    joinSession.mockResolvedValue({ err: { message: 'joinWindowClosed' } });
    render(<SessionJoinButton sessionId="s1" provider={MeetingProvider.EXTERNAL_URL} callHref="/call/s1" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(opened.close).toHaveBeenCalled();
    expect(opened.location.href).toBe('');
  });

  it('closes the blank tab and shows a failure message when the request itself fails', async () => {
    joinSession.mockRejectedValue(new Error('network'));
    render(<SessionJoinButton sessionId="s1" provider={MeetingProvider.EXTERNAL_URL} callHref="/call/s1" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('sessions.join.failed'));
    expect(opened.close).toHaveBeenCalled();
  });

  it('never navigates to a non-http(s) link', async () => {
    joinSession.mockResolvedValue({ provider: MeetingProvider.EXTERNAL_URL, meetingLink: 'javascript:alert(1)' });
    render(<SessionJoinButton sessionId="s1" provider={MeetingProvider.EXTERNAL_URL} callHref="/call/s1" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(opened.close).toHaveBeenCalled());
    expect(opened.location.href).toBe('');
  });
});
