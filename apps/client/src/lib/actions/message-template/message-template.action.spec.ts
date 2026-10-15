import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as templateAction from './message-template.action';

vi.mock('@/lib/utils/createNatsRequest', () => ({
  createAuthorizedNatsRequest: vi.fn(),
}));

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

describe('message-template.action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listMessageTemplates calls messageTemplates.list', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue([{ _id: 't1' }]);
    const result = await templateAction.listMessageTemplates();
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('messageTemplates.list', {});
    expect(result).toEqual([{ _id: 't1' }]);
  });

  it('createMessageTemplate calls messageTemplates.create with dto', async () => {
    const dto = { name: 'Welcome', context: 'STUDENT' as const, body: 'Hello {{studentName}}' };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 't1', ...dto });
    const result = await templateAction.createMessageTemplate(dto);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('messageTemplates.create', dto);
    expect(result).toEqual({ _id: 't1', ...dto });
  });

  it('updateMessageTemplate calls messageTemplates.update with id and patch', async () => {
    const patch = { body: 'Hi {{studentName}}' };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 't1', ...patch });
    const result = await templateAction.updateMessageTemplate('t1', patch);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('messageTemplates.update', { id: 't1', ...patch });
    expect(result).toEqual({ _id: 't1', ...patch });
  });

  it('deleteMessageTemplate calls messageTemplates.remove with id', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 't1' });
    const result = await templateAction.deleteMessageTemplate('t1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('messageTemplates.remove', { id: 't1' });
    expect(result).toEqual({ _id: 't1' });
  });

  it('renderMessageTemplate calls messageTemplates.render with id and dto', async () => {
    const dto = { groupId: 'g1', studentId: 's1' };
    const rendered = { text: 'Hello Ahmad', missingVariables: [], phone: '+966501234567', waLink: 'https://wa.me/966501234567' };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue(rendered);
    const result = await templateAction.renderMessageTemplate('t1', dto);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('messageTemplates.render', { id: 't1', ...dto });
    expect(result).toEqual(rendered);
  });

  it('renderMessageTemplate for GROUP context passes only groupId', async () => {
    const dto = { groupId: 'g1' };
    const rendered = { text: 'Course starts Monday', missingVariables: [] };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue(rendered);
    const result = await templateAction.renderMessageTemplate('t2', dto);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('messageTemplates.render', { id: 't2', groupId: 'g1' });
    expect(result).toEqual(rendered);
  });
});
