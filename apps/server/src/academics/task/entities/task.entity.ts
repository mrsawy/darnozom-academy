import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReadinessKey, TaskClosedReason, TaskKind, TaskStatus, TASK_MAX_ESCALATION_LEVEL } from '@darnozom/shared-types';

@Schema({ timestamps: true })
export class Task extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(TaskKind), default: TaskKind.PRE_START_READINESS })
  kind: TaskKind;

  @Prop({ type: String, enum: Object.values(ReadinessKey), required: true })
  readinessKey: ReadinessKey;

  /** The most urgent milestone reached when this task was created or tightened (plan decision D3). */
  @Prop({ type: Number, required: true })
  milestoneDays: number;

  /** Null means the manager queue: every user holding MANAGER owns it (plan decision D4). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  assigneeId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0, min: 0, max: TASK_MAX_ESCALATION_LEVEL })
  escalationLevel: number;

  @Prop({ type: Date, required: true })
  dueAt: Date;

  @Prop({ type: String, enum: Object.values(TaskStatus), default: TaskStatus.OPEN })
  status: TaskStatus;

  @Prop({ type: Date, required: false, default: null })
  closedAt: Date | null;

  @Prop({ type: String, enum: Object.values(TaskClosedReason), required: false, default: null })
  closedReason: TaskClosedReason | null;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ status: 1, dueAt: 1 }, { name: 'task_due_sweep' });
TaskSchema.index({ groupId: 1, readinessKey: 1, status: 1 }, { name: 'task_by_group_item' });
TaskSchema.index({ assigneeId: 1, status: 1 }, { name: 'task_by_assignee' });
// One live task per missing item. This index, not a read-then-write check, is what makes
// generation idempotent under concurrent sweeps (plan decision D1).
TaskSchema.index(
  { groupId: 1, readinessKey: 1 },
  { unique: true, partialFilterExpression: { status: TaskStatus.OPEN }, name: 'one_open_task_per_group_item' }
);
