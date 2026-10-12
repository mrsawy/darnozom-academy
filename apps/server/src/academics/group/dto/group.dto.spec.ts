import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateGroupDto } from './group.dto';

// @nestjs/mapped-types is ESM-only and Jest cannot load it; the link decorators live on CreateGroupDto itself.
jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (base: new () => object) => base,
  OmitType: (base: new () => object) => base,
}));

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
