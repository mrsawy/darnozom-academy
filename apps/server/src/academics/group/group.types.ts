import { Types } from 'mongoose';
import { AtRiskReason, GroupPaymentStatus, GroupStatus, GroupStudentStatus, Readiness, ScheduleSlot } from '@darnozom/shared-types';

export interface GroupStudentLean {
  studentId: Types.ObjectId;
  paymentStatus: GroupPaymentStatus;
  whatsappAdded: boolean;
  addedAt: Date;
  addedBy?: Types.ObjectId;
  status?: GroupStudentStatus;
  withdrawnAt?: Date;
}

export interface GroupLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  cohortId: Types.ObjectId;
  levelId: Types.ObjectId;
  courseId: Types.ObjectId;
  name: string;
  teacherId: Types.ObjectId | null;
  coordinatorId: Types.ObjectId | null;
  supervisorId: Types.ObjectId | null;
  atRisk: boolean;
  atRiskSince: Date | null;
  atRiskReason: AtRiskReason | null;
  schedule: ScheduleSlot[];
  timezone: string;
  minStudents: number;
  maxStudents: number;
  totalSessions?: number | null;
  meetingLink?: string | null;
  whatsappGroupLink?: string | null;
  contentSent: { done: boolean; by?: Types.ObjectId; at?: Date };
  students: GroupStudentLean[];
  status: GroupStatus;
  statusHistory: { from: GroupStatus | null; to: GroupStatus; by: Types.ObjectId | null; at: Date; reason?: string }[];
}

export type GroupView = GroupLean & { readiness: Readiness };

/** findOne adds display names (id → "First Last") for the teacher and every visible student. */
export type GroupDetailView = GroupView & { people: Record<string, string> };
