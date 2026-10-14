import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SESSION_SCORE_MAX, SESSION_SCORE_MIN } from '@darnozom/shared-types';

const score = { type: Number, required: true, min: SESSION_SCORE_MIN, max: SESSION_SCORE_MAX } as const;

@Schema({ _id: false })
export class SupervisionNotes {
  @Prop({ type: String, required: false, trim: true })
  commitment?: string;

  @Prop({ type: String, required: false, trim: true })
  teaching?: string;

  @Prop({ type: String, required: false, trim: true })
  pedagogy?: string;

  @Prop({ type: String, required: false, trim: true })
  contentAdherence?: string;

  @Prop({ type: String, required: false, trim: true })
  technicalQuality?: string;

  @Prop({ type: String, required: false, trim: true })
  general?: string;
}
export const SupervisionNotesSchema = SchemaFactory.createForClass(SupervisionNotes);

/**
 * A supervisor's judgment of one held session, on the concept's five criteria.
 *
 * Deliberately carries no monetary field. That is the whole mechanism behind the concept's rule
 * that supervisors cannot impose financial penalties without authorization: there is nothing here
 * that pay can read, and sub-project 7's payroll never queries this collection.
 */
@Schema({ timestamps: true })
export class SupervisionEvaluation extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  /** Who wrote it. Recorded even if the supervisor seat later changes hands (plan decision D3). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  supervisorId: Types.ObjectId;

  @Prop(score)
  commitment: number;

  @Prop(score)
  teaching: number;

  @Prop(score)
  pedagogy: number;

  @Prop(score)
  contentAdherence: number;

  @Prop(score)
  technicalQuality: number;

  @Prop({ type: SupervisionNotesSchema, default: () => ({}) })
  notes: SupervisionNotes;
}

export const SupervisionEvaluationSchema = SchemaFactory.createForClass(SupervisionEvaluation);
SupervisionEvaluationSchema.index({ sessionId: 1, supervisorId: 1 }, { unique: true, name: 'one_evaluation_per_supervisor_session' });
SupervisionEvaluationSchema.index({ organizationId: 1, groupId: 1, createdAt: -1 }, { name: 'evaluations_by_group' });
SupervisionEvaluationSchema.index({ organizationId: 1, teacherId: 1, createdAt: -1 }, { name: 'evaluations_by_teacher' });
