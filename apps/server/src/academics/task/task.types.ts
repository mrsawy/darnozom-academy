import { Types } from 'mongoose';
import { ReadinessKey, TaskClosedReason, TaskKind, TaskStatus } from '@darnozom/shared-types';

export interface TaskLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  kind: TaskKind;
  readinessKey: ReadinessKey;
  milestoneDays: number;
  assigneeId: Types.ObjectId | null;
  escalationLevel: number;
  dueAt: Date;
  status: TaskStatus;
  closedAt: Date | null;
  closedReason: TaskClosedReason | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** What the client reads: the task plus the group name it belongs to. */
export interface TaskView extends TaskLean {
  groupName: string;
}
