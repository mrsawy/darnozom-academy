import { Types } from 'mongoose';

export interface SupervisionNotesLean {
  commitment?: string;
  teaching?: string;
  pedagogy?: string;
  contentAdherence?: string;
  technicalQuality?: string;
  general?: string;
}

export interface SupervisionEvaluationLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  sessionId: Types.ObjectId;
  groupId: Types.ObjectId;
  teacherId: Types.ObjectId;
  supervisorId: Types.ObjectId;
  commitment: number;
  teaching: number;
  pedagogy: number;
  contentAdherence: number;
  technicalQuality: number;
  notes: SupervisionNotesLean;
  createdAt: Date;
  updatedAt?: Date;
}

/** What the client reads: the evaluation plus the names a list needs. */
export interface SupervisionEvaluationView extends SupervisionEvaluationLean {
  groupName: string;
  sessionSequence: number;
  sessionStartsAt: Date;
}
