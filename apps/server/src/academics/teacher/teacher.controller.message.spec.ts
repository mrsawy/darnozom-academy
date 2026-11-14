import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Actions, Subjects } from '@darnozom/shared-types';
import { PERMISSIONS_KEY } from 'src/role/permission.decorator';
import { TeacherControllerMessage } from './teacher.controller.message';

const proto = TeacherControllerMessage.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

describe('TeacherControllerMessage', () => {
  it('answers academics.teachers.overview and requires READ SESSION (never MANAGE)', () => {
    expect(Reflect.getMetadata(PATTERN_METADATA, proto.getOverview)).toEqual(['academics.teachers.overview']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto.getOverview)).toEqual([{ action: Actions.READ, subject: Subjects.SESSION }]);
  });

  it('exposes exactly one handler', () => {
    const handlers = Object.getOwnPropertyNames(TeacherControllerMessage.prototype).filter((name) => name !== 'constructor');
    expect(handlers).toEqual(['getOverview']);
  });
});
