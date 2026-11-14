import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateGroupDto, UpdateGroupDto } from './group.dto';

const LINK_FIELDS = ['meetingLink', 'whatsappGroupLink'] as const;

const linkErrors = (field: (typeof LINK_FIELDS)[number], value: unknown) =>
  validateSync(plainToInstance(CreateGroupDto, { [field]: value })).filter((e) => e.property === field);

describe('group link fields', () => {
  it.each(LINK_FIELDS)('%s accepts absolute http(s) URLs and null', (field) => {
    expect(linkErrors(field, 'https://meet.example.com/abc')).toHaveLength(0);
    expect(linkErrors(field, 'http://chat.whatsapp.com/xyz')).toHaveLength(0);
    expect(linkErrors(field, null)).toHaveLength(0);
  });

  it.each(LINK_FIELDS)('%s rejects scriptable, non-web and protocol-less links', (field) => {
    for (const value of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://files.example.com', 'meet.example.com/abc']) {
      expect({ value, rejected: linkErrors(field, value).length > 0 }).toEqual({ value, rejected: true });
    }
  });
});

describe('meetingProvider', () => {
  const errors = (Dto: typeof CreateGroupDto | typeof UpdateGroupDto, value: unknown) =>
    validateSync(plainToInstance(Dto as never, { meetingProvider: value })).filter((e) => e.property === 'meetingProvider');

  it('accepts AGORA and EXTERNAL_URL on create and update, without a link', () => {
    for (const Dto of [CreateGroupDto, UpdateGroupDto]) {
      expect(errors(Dto, 'AGORA')).toHaveLength(0);
      expect(errors(Dto, 'EXTERNAL_URL')).toHaveLength(0);
    }
  });
  it('rejects an unknown provider', () => {
    expect(errors(CreateGroupDto, 'ZOOM').length).toBeGreaterThan(0);
    expect(errors(UpdateGroupDto, 'ZOOM').length).toBeGreaterThan(0);
  });
});
