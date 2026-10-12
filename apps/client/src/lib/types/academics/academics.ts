import type {
  AvailabilitySlot,
  GroupPaymentStatus,
  GroupStatus,
  Readiness,
  ScheduleSlot,
  TeacherFitReason,
} from '@darnozom/shared-types';

export interface IProgram {
  _id: string;
  name: string;
  description?: string;
}

export interface ICourseOption {
  _id: string;
  name: string;
  programId?: string | null;
}

export interface ILevel {
  _id: string;
  courseId: string;
  name: string;
  order: number;
}

export interface ICohort {
  _id: string;
  levelId: string;
  name: string;
  startDate: string;
}

export interface IGroupStudent {
  studentId: string;
  paymentStatus: GroupPaymentStatus;
  whatsappAdded: boolean;
  addedAt: string;
}

export interface IGroup {
  _id: string;
  cohortId: string;
  levelId: string;
  courseId: string;
  name: string;
  teacherId: string | null;
  schedule: ScheduleSlot[];
  timezone: string;
  minStudents: number;
  maxStudents: number;
  meetingLink?: string | null;
  whatsappGroupLink?: string | null;
  contentSent: { done: boolean };
  students: IGroupStudent[];
  status: GroupStatus;
  readiness: Readiness;
}

export interface IGroupDetail extends IGroup {
  people: Record<string, string>;
}

export interface GroupQuery {
  cohortId?: string;
  status?: GroupStatus;
  childId?: string;
  teacherId?: string;
}

export interface GroupFormValues {
  name: string;
  schedule: ScheduleSlot[];
  timezone: string;
  minStudents: number;
  maxStudents: number;
  meetingLink: string | null;
  whatsappGroupLink: string | null;
}

export interface IStudentCandidate {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

export interface ITeacherCandidate {
  teacherId: string;
  name: string;
  ok: boolean;
  reasons: TeacherFitReason[];
}

export interface ITeacherAvailability {
  teacherId: string;
  timezone: string | null;
  slots: AvailabilitySlot[];
}
