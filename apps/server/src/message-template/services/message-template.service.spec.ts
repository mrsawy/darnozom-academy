import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MessageTemplateService } from './message-template.service';

const ORG = new Types.ObjectId();
const USER = new Types.ObjectId();

const makeService = (overrides: Partial<{
  findOne: jest.Mock; find: jest.Mock; create: jest.Mock;
}> = {}) => {
  const saved: Record<string, unknown>[] = [];
  const model = {
    findOne: jest.fn(async (q: Record<string, unknown>) =>
      saved.find((t: any) => t.name === (q as any).name && t.deletedAt == null) ?? null
    ),
    find: jest.fn(async () => saved.filter((t: any) => t.deletedAt == null)),
    create: jest.fn(async (doc: Record<string, unknown>) => {
      const t = { ...doc, _id: new Types.ObjectId() };
      saved.push(t);
      return t;
    }),
    ...overrides,
  };
  return { service: new MessageTemplateService(model as any), model, saved };
};

describe('MessageTemplateService.create', () => {
  it('creates a template with valid GROUP variables', async () => {
    const { service } = makeService();
    const result = await service.create(String(ORG), String(USER), {
      name: 'Welcome', context: 'GROUP', body: 'Hello {{groupName}}',
    });
    expect(result).toMatchObject({ name: 'Welcome', context: 'GROUP' });
  });

  it('rejects unknown variables', async () => {
    const { service } = makeService();
    await expect(
      service.create(String(ORG), String(USER), {
        name: 'Bad', context: 'GROUP', body: '{{unknownVar}}',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects STUDENT-only variable in GROUP context', async () => {
    const { service } = makeService();
    await expect(
      service.create(String(ORG), String(USER), {
        name: 'Bad2', context: 'GROUP', body: '{{studentName}}',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when name is already taken in org', async () => {
    const existing = { name: 'Dupe', organizationId: ORG, deletedAt: null };
    const { service } = makeService({ findOne: jest.fn(async () => existing) });
    await expect(
      service.create(String(ORG), String(USER), {
        name: 'Dupe', context: 'STUDENT', body: '{{studentName}}',
      })
    ).rejects.toThrow(ConflictException);
  });
});

describe('MessageTemplateService.remove', () => {
  it('soft-deletes an existing template', async () => {
    const template = {
      _id: new Types.ObjectId(), organizationId: ORG, deletedAt: null,
      save: jest.fn(async function(this: any) { return this; }),
    };
    const findOneMock = jest.fn(async () => template);
    const { service } = makeService({ findOne: findOneMock });
    await service.remove(String(ORG), String(template._id));
    expect(template.save).toHaveBeenCalled();
    expect(template.deletedAt).toBeInstanceOf(Date);
  });

  it('throws NotFoundException when template does not exist', async () => {
    const { service } = makeService({ findOne: jest.fn(async () => null) });
    await expect(service.remove(String(ORG), String(new Types.ObjectId()))).rejects.toThrow(NotFoundException);
  });
});
