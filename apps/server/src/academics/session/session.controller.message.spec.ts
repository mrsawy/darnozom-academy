import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Actions, Subjects } from '@darnozom/shared-types';
import { PERMISSIONS_KEY } from 'src/role/permission.decorator';
import { SessionControllerMessage } from './session.controller.message';

const proto = SessionControllerMessage.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

const expected: [string, string, Actions, Subjects][] = [
  ['start', 'academics.groups.start', Actions.UPDATE, Subjects.GROUP],
  ['create', 'academics.sessions.create', Actions.UPDATE, Subjects.GROUP],
  ['reschedule', 'academics.sessions.reschedule', Actions.UPDATE, Subjects.GROUP],
  ['delete', 'academics.sessions.delete', Actions.UPDATE, Subjects.GROUP],
  ['findAll', 'academics.sessions.findAll', Actions.READ, Subjects.SESSION],
  ['findOne', 'academics.sessions.findOne', Actions.READ, Subjects.SESSION],
  ['cancel', 'academics.sessions.cancel', Actions.UPDATE, Subjects.GROUP],
  ['markAttendance', 'academics.sessions.markAttendance', Actions.UPDATE, Subjects.SESSION],
  ['markTeacherAttendance', 'academics.sessions.markTeacherAttendance', Actions.UPDATE, Subjects.GROUP],
  ['submitReport', 'academics.sessions.submitReport', Actions.UPDATE, Subjects.SESSION],
  ['editReport', 'academics.sessions.editReport', Actions.UPDATE, Subjects.SESSION],
  ['listFollowUps', 'academics.followUps.list', Actions.UPDATE, Subjects.GROUP],
  ['updateFollowUp', 'academics.followUps.update', Actions.UPDATE, Subjects.GROUP],
];

describe('SessionControllerMessage', () => {
  it.each(expected)('%s answers %s and requires %s %s (never MANAGE)', (method, pattern, action, subject) => {
    expect(Reflect.getMetadata(PATTERN_METADATA, proto[method])).toEqual([pattern]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto[method])).toEqual([{ action, subject }]);
    expect(action).not.toBe(Actions.MANAGE);
  });

  it('exposes exactly the documented handlers', () => {
    const handlers = Object.getOwnPropertyNames(SessionControllerMessage.prototype).filter((name) => name !== 'constructor');
    expect(handlers.sort()).toEqual(expected.map(([method]) => method).sort());
  });
});
