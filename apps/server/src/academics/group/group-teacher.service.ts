import { Injectable } from '@nestjs/common';
import { ScheduleSlot } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { GroupLean } from './group.types';

@Injectable()
export class GroupTeacherService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- replaced in Task 11
  async assertScheduleChangeFits(_actor: AcademicsActor, _group: GroupLean, _next: { schedule: ScheduleSlot[]; timezone: string }): Promise<void> {}
}
