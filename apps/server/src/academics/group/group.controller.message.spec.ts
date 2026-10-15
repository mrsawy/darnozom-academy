import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Actions, Subjects } from '@darnozom/shared-types';
import { PERMISSIONS_KEY } from 'src/role/permission.decorator';
import { GroupControllerMessage } from './group.controller.message';

const proto = GroupControllerMessage.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

const expected: [string, string, Actions, Subjects][] = [
  ['findAll', 'academics.groups.findAll', Actions.READ, Subjects.GROUP],
  ['findOne', 'academics.groups.findOne', Actions.READ, Subjects.GROUP],
  ['create', 'academics.groups.create', Actions.CREATE, Subjects.GROUP],
  ['update', 'academics.groups.update', Actions.UPDATE, Subjects.GROUP],
  ['remove', 'academics.groups.delete', Actions.DELETE, Subjects.GROUP],
  ['markReady', 'academics.groups.markReady', Actions.UPDATE, Subjects.GROUP],
  ['cancel', 'academics.groups.cancel', Actions.UPDATE, Subjects.GROUP],
  ['setContentSent', 'academics.groups.setContentSent', Actions.UPDATE, Subjects.GROUP],
  ['studentCandidates', 'academics.groups.studentCandidates', Actions.UPDATE, Subjects.GROUP],
  ['addStudent', 'academics.groups.addStudent', Actions.UPDATE, Subjects.GROUP],
  ['removeStudent', 'academics.groups.removeStudent', Actions.UPDATE, Subjects.GROUP],
  ['setWhatsapp', 'academics.groups.setWhatsapp', Actions.UPDATE, Subjects.GROUP],
  ['assignTeacher', 'academics.groups.assignTeacher', Actions.UPDATE, Subjects.GROUP],
  ['unassignTeacher', 'academics.groups.unassignTeacher', Actions.UPDATE, Subjects.GROUP],
  ['teacherCandidates', 'academics.groups.teacherCandidates', Actions.UPDATE, Subjects.GROUP],
  ['setFinalResult', 'academics.groups.setFinalResult', Actions.READ, Subjects.GROUP],
];

describe('GroupControllerMessage', () => {
  it.each(expected)('%s answers %s and requires %s %s', (method, pattern, action, subject) => {
    expect(Reflect.getMetadata(PATTERN_METADATA, proto[method])).toEqual([pattern]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto[method])).toEqual([{ action, subject }]);
  });

  it('exposes exactly the documented handlers', () => {
    const handlers = Object.getOwnPropertyNames(GroupControllerMessage.prototype).filter((name) => name !== 'constructor');
    expect(handlers.sort()).toEqual(expected.map(([method]) => method).sort());
  });
});
