import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/utils', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: vi.fn(() => (k: string) => k) }));
vi.mock('@/lib/utils/errors/translateApiMessage', () => ({ translateApiMessage: vi.fn() }));
vi.mock('@/lib/utils/academics/unwrap', () => ({ unwrap: vi.fn() }));
vi.mock('@/lib/actions/message-template/message-template.action', () => ({}));

import { messageTemplateKeys } from './use-message-template.hook';

describe('messageTemplateKeys', () => {
  it('namespaces all keys under messageTemplates root so invalidating messageTemplates invalidates everything', () => {
    expect(messageTemplateKeys.all[0]).toBe('messageTemplates');
    expect(messageTemplateKeys.list()[0]).toBe('messageTemplates');
  });

  it('list key is stable across calls', () => {
    expect(messageTemplateKeys.list()).toEqual(['messageTemplates', 'list']);
    expect(messageTemplateKeys.list()).toEqual(messageTemplateKeys.list());
  });
});
