import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Roles } from '@darnozom/shared-types';
import { TemplateRenderService } from './template-render.service';

const ORG = new Types.ObjectId();
const GROUP_ID = new Types.ObjectId();
const STUDENT_ID = new Types.ObjectId();
const TEACHER_ID = new Types.ObjectId();
const LEVEL_ID = new Types.ObjectId();
const COURSE_ID = new Types.ObjectId();

const makeGroup = (overrides = {}) => ({
  _id: GROUP_ID,
  organizationId: ORG,
  name: 'Math Group',
  students: [{ studentId: STUDENT_ID, status: 'ACTIVE' }],
  schedule: [{ dayOfWeek: 6, startTime: '17:00', durationMinutes: 60 }],
  timezone: 'Africa/Cairo',
  meetingLink: 'https://meet.example.com',
  whatsappGroupLink: null,
  teacherId: TEACHER_ID,
  startDate: new Date('2026-11-01'),
  levelId: LEVEL_ID,
  courseId: COURSE_ID,
  ...overrides,
});

const makeStudent = (phone?: string) => ({
  _id: STUDENT_ID, firstName: 'Ahmed', lastName: 'Ali', phone,
  childUsersIds: [],
});

const makeService = (template: any, group: any, student: any, level: any, course: any, teacher: any) => {
  const templateService = { findOne: jest.fn(async () => template) };
  const groupModel = {
    findOne: jest.fn(async () => group),
  };
  const userModel = {
    findById: jest.fn((id: Types.ObjectId) => {
      const result = String(id) === String(STUDENT_ID) ? student : String(id) === String(TEACHER_ID) ? teacher : null;
      return { lean: () => ({ exec: async () => result }) };
    }),
  };
  const levelModel = { findById: jest.fn(() => ({ lean: () => ({ exec: async () => level }) })) };
  const courseModel = { findById: jest.fn(() => ({ lean: () => ({ exec: async () => course }) })) };
  return new TemplateRenderService(
    templateService as any,
    groupModel as any,
    userModel as any,
    levelModel as any,
    courseModel as any,
  );
};

describe('TemplateRenderService.render', () => {
  it('renders a GROUP template with live values', async () => {
    const template = { context: 'GROUP', body: 'Join {{groupName}} on {{schedule}}' };
    const group = makeGroup();
    const service = makeService(template, group, null, { name: 'Arabic' }, { name: 'Quran' }, { firstName: 'Sara', lastName: 'T' });
    const result = await service.render(
      { _id: String(ORG), organizationId: String(ORG), roleName: Roles.MANAGER, additionalRoles: [] },
      String(new Types.ObjectId()),
      { groupId: String(GROUP_ID) },
    );
    expect(result.text).toContain('Math Group');
    expect(result.missingVariables).toBeInstanceOf(Array);
  });

  it('rejects when student is not in the group', async () => {
    const template = { context: 'STUDENT', body: '{{studentName}}' };
    const group = makeGroup({ students: [] });
    const service = makeService(template, group, makeStudent('+201234567890'), { name: 'Arabic' }, { name: 'Quran' }, { firstName: 'Sara', lastName: 'T' });
    await expect(
      service.render(
        { _id: String(ORG), organizationId: String(ORG), roleName: Roles.MANAGER, additionalRoles: [] },
        String(new Types.ObjectId()),
        { groupId: String(GROUP_ID), studentId: String(STUDENT_ID) },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('includes phone and waLink when student has a phone', async () => {
    const template = { context: 'STUDENT', body: '{{studentName}}' };
    const group = makeGroup();
    const service = makeService(template, group, makeStudent('+20 123 456 7890'), { name: 'Arabic' }, { name: 'Quran' }, { firstName: 'Sara', lastName: 'T' });
    const result = await service.render(
      { _id: String(ORG), organizationId: String(ORG), roleName: Roles.MANAGER, additionalRoles: [] },
      String(new Types.ObjectId()),
      { groupId: String(GROUP_ID), studentId: String(STUDENT_ID) },
    );
    expect(result.phone).toBeDefined();
    expect(result.waLink).toContain('wa.me');
  });

  it('omits waLink when student has no phone', async () => {
    const template = { context: 'STUDENT', body: '{{studentName}}' };
    const group = makeGroup();
    const service = makeService(template, group, makeStudent(undefined), { name: 'Arabic' }, { name: 'Quran' }, { firstName: 'Sara', lastName: 'T' });
    const result = await service.render(
      { _id: String(ORG), organizationId: String(ORG), roleName: Roles.MANAGER, additionalRoles: [] },
      String(new Types.ObjectId()),
      { groupId: String(GROUP_ID), studentId: String(STUDENT_ID) },
    );
    expect(result.phone).toBeUndefined();
    expect(result.waLink).toBeUndefined();
  });
});
