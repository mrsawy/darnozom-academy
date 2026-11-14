'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import type {
  AttendanceStatus,
  AvailabilitySlot,
  FollowUpDecision,
  Roles,
} from '@darnozom/shared-types';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as programsApi from '@/lib/actions/academics/programs.action';
import * as structureApi from '@/lib/actions/academics/structure.action';
import * as groupsApi from '@/lib/actions/academics/groups.action';
import * as availabilityApi from '@/lib/actions/academics/teacher-availability.action';
import * as sessionsApi from '@/lib/actions/academics/sessions.action';
import * as followUpsApi from '@/lib/actions/academics/follow-ups.action';
import * as tasksApi from '@/lib/actions/academics/tasks.action';
import * as supervisionApi from '@/lib/actions/academics/supervision.action';
import * as teachersApi from '@/lib/actions/academics/teachers.action';
import { setAdditionalRoles } from '@/lib/actions/academics/additional-roles.action';
import type {
  AttendanceEntry,
  EvaluationQuery,
  GroupFormValues,
  GroupQuery,
  ITask,
  ITasks,
  ReportValues,
  SessionQuery,
  SupervisionScores,
  TaskQuery,
  TeacherOverviewQuery,
} from '@/lib/types/academics/academics';

const ROOT = 'academics';

/**
 * Academics data is edited from several screens (a teacher's availability, a group's roster...), and the app-wide
 * default is `refetchOnMount: false`. Every query below therefore sets `refetchOnMount: true`, which still only
 * refetches when the cache is stale (e.g. right after a mutation invalidated it) so pages open with fresh data.
 */
export const academicsKeys = {
  programs: [ROOT, 'programs'] as const,
  program: (id: string) => [ROOT, 'program', id] as const,
  programCourses: (id: string) => [ROOT, 'program-courses', id] as const,
  courseOptions: [ROOT, 'course-options'] as const,
  levels: (courseId: string) => [ROOT, 'levels', courseId] as const,
  cohorts: (levelId: string) => [ROOT, 'cohorts', levelId] as const,
  cohort: (id: string) => [ROOT, 'cohort', id] as const,
  groups: (query: GroupQuery) => [ROOT, 'groups', query] as const,
  group: (id: string) => [ROOT, 'group', id] as const,
  attendanceMatrix: (id: string) => [ROOT, 'attendance-matrix', id] as const,
  teacherOverview: (query: TeacherOverviewQuery) => [ROOT, 'teacher-overview', query] as const,
  studentCandidates: (id: string, q: string) => [ROOT, 'student-candidates', id, q] as const,
  teacherCandidates: (id: string) => [ROOT, 'teacher-candidates', id] as const,
  myAvailability: [ROOT, 'my-availability'] as const,
  teacherAvailability: (teacherId: string) => [ROOT, 'teacher-availability', teacherId] as const,
  sessions: (query: SessionQuery) => [ROOT, 'sessions', query] as const,
  session: (id: string) => [ROOT, 'session', id] as const,
  followUps: (groupId: string) => [ROOT, 'follow-ups', groupId] as const,
  myTasks: (query: TaskQuery) => [ROOT, 'my-tasks', query] as const,
  groupTasks: (groupId: string) => [ROOT, 'group-tasks', groupId] as const,
  evaluations: (query: EvaluationQuery) => [ROOT, 'evaluations', query] as const,
  sessionEvaluations: (sessionId: string) => [ROOT, 'session-evaluations', sessionId] as const,
};

export const useCohort = (id: string | null) =>
  useQuery({
    queryKey: academicsKeys.cohort(id ?? ''),
    refetchOnMount: true,
    queryFn: async () => unwrap(await structureApi.getCohort(id as string)),
    enabled: !!id,
  });
export const usePrograms = () =>
  useQuery({
    queryKey: academicsKeys.programs,
    refetchOnMount: true,
    queryFn: async () => unwrap(await programsApi.getPrograms()),
  });
export const useProgram = (id: string) =>
  useQuery({
    queryKey: academicsKeys.program(id),
    refetchOnMount: true,
    queryFn: async () => unwrap(await programsApi.getProgram(id)),
    enabled: !!id,
  });
export const useProgramCourses = (id: string) =>
  useQuery({
    queryKey: academicsKeys.programCourses(id),
    refetchOnMount: true,
    queryFn: async () => unwrap(await programsApi.getProgramCourses(id)),
    enabled: !!id,
  });
export const useCourseOptions = () =>
  useQuery({
    queryKey: academicsKeys.courseOptions,
    refetchOnMount: true,
    queryFn: async () => unwrap(await programsApi.getCourseOptions()),
  });
export const useTrainingCourse = (id: string) =>
  useQuery({
    queryKey: [ROOT, 'training-course', id] as const,
    refetchOnMount: true,
    queryFn: async () => unwrap(await programsApi.getTrainingCourse(id)),
    enabled: !!id,
  });
export const useLevels = (courseId: string) =>
  useQuery({
    queryKey: academicsKeys.levels(courseId),
    refetchOnMount: true,
    queryFn: async () => unwrap(await structureApi.getLevels(courseId)),
    enabled: !!courseId,
  });
export const useCohorts = (levelId: string) =>
  useQuery({
    queryKey: academicsKeys.cohorts(levelId),
    refetchOnMount: true,
    queryFn: async () => unwrap(await structureApi.getCohorts(levelId)),
    enabled: !!levelId,
  });
export const useGroups = (query: GroupQuery) =>
  useQuery({
    queryKey: academicsKeys.groups(query),
    refetchOnMount: true,
    queryFn: async () => unwrap(await groupsApi.getGroups(query)),
  });
export const useGroup = (id: string) =>
  useQuery({
    queryKey: academicsKeys.group(id),
    refetchOnMount: true,
    queryFn: async () => unwrap(await groupsApi.getGroup(id)),
    enabled: !!id,
  });
export const useGroupAttendanceMatrix = (id: string, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.attendanceMatrix(id),
    refetchOnMount: true,
    queryFn: async () => unwrap(await groupsApi.getGroupAttendanceMatrix(id)),
    enabled: !!id && enabled,
  });
export const useTeacherOverview = (query: TeacherOverviewQuery) =>
  useQuery({
    queryKey: academicsKeys.teacherOverview(query),
    refetchOnMount: true,
    queryFn: async () => unwrap(await teachersApi.getTeacherOverview(query)),
    enabled: !!query.id,
  });
export const useStudentCandidates = (id: string, q: string) =>
  useQuery({
    queryKey: academicsKeys.studentCandidates(id, q),
    refetchOnMount: true,
    queryFn: async () => unwrap(await groupsApi.getStudentCandidates(id, q)),
    enabled: !!id,
  });
export const useTeacherCandidates = (id: string) =>
  useQuery({
    queryKey: academicsKeys.teacherCandidates(id),
    refetchOnMount: true,
    queryFn: async () => unwrap(await groupsApi.getTeacherCandidates(id)),
    enabled: !!id,
  });
export const useMyAvailability = () =>
  useQuery({
    queryKey: academicsKeys.myAvailability,
    refetchOnMount: true,
    queryFn: async () => unwrap(await availabilityApi.getMyAvailability()),
  });

export const useTeacherAvailability = (teacherId?: string) =>
  useQuery({
    queryKey: academicsKeys.teacherAvailability(teacherId ?? ''),
    refetchOnMount: true,
    queryFn: async () => unwrap(await availabilityApi.getTeacherAvailability(teacherId as string)),
    enabled: !!teacherId,
  });

export const useSaveTeacherAvailability = () =>
  useAcademicsMutation(
    async (v: { teacherId: string; timezone: string; slots: AvailabilitySlot[] }) =>
      unwrap(await availabilityApi.saveTeacherAvailability(v))
  );

/** Shared mutation behaviour: success toast, refresh every academics query, translated error toast. */
export function useAcademicsMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const t = useTranslations('Academics');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(t('saved'));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export const useCreateProgram = () =>
  useAcademicsMutation(async (v: { name: string; description?: string }) =>
    unwrap(await programsApi.createProgram(v))
  );
export const useUpdateProgram = () =>
  useAcademicsMutation(async (v: { id: string; data: { name?: string; description?: string } }) =>
    unwrap(await programsApi.updateProgram(v.id, v.data))
  );
export const useDeleteProgram = () =>
  useAcademicsMutation(async (id: string) => unwrap(await programsApi.deleteProgram(id)));
export const useCreateTrainingCourse = () =>
  useAcademicsMutation(async (name: string) => unwrap(await programsApi.createTrainingCourse(name)));
export const useUpdateTrainingCourse = () =>
  useAcademicsMutation(async (v: { id: string; name: string }) =>
    unwrap(await programsApi.updateTrainingCourse(v.id, v.name))
  );
export const useDeleteTrainingCourse = () =>
  useAcademicsMutation(async (id: string) => unwrap(await programsApi.deleteTrainingCourse(id)));
export const useLinkCourse = () =>
  useAcademicsMutation(async (v: { programId: string; courseId: string }) =>
    unwrap(await programsApi.linkCourse(v.programId, v.courseId))
  );
export const useUnlinkCourse = () =>
  useAcademicsMutation(async (courseId: string) =>
    unwrap(await programsApi.unlinkCourse(courseId))
  );
export const useCreateLevel = () =>
  useAcademicsMutation(async (v: { courseId: string; name: string; order: number; ageRangeId?: string; certificateRules?: import('@darnozom/shared-types').ICertificateRules }) =>
    unwrap(await structureApi.createLevel(v))
  );
export const useUpdateLevel = () =>
  useAcademicsMutation(
    async (v: {
      id: string;
      data: {
        name?: string;
        order?: number;
        ageRangeId?: string | null;
        certificateRules?: import('@darnozom/shared-types').ICertificateRules;
      };
    }) => unwrap(await structureApi.updateLevel(v.id, v.data))
  );
export const useDeleteLevel = () =>
  useAcademicsMutation(async (id: string) => unwrap(await structureApi.deleteLevel(id)));
export const useCreateCohort = () =>
  useAcademicsMutation(async (v: { levelId: string; name: string; startDate: string }) =>
    unwrap(await structureApi.createCohort(v))
  );
export const useUpdateCohort = () =>
  useAcademicsMutation(async (v: { id: string; data: { name?: string; startDate?: string } }) =>
    unwrap(await structureApi.updateCohort(v.id, v.data))
  );
export const useDeleteCohort = () =>
  useAcademicsMutation(async (id: string) => unwrap(await structureApi.deleteCohort(id)));
export const useCreateGroup = () =>
  useAcademicsMutation(async (v: GroupFormValues & { cohortId: string }) =>
    unwrap(await groupsApi.createGroup(v))
  );
export const useUpdateGroup = () =>
  useAcademicsMutation(
    async (v: {
      id: string;
      data: Partial<GroupFormValues> & {
        coordinatorId?: string | null;
        supervisorId?: string | null;
      };
    }) => unwrap(await groupsApi.updateGroup(v.id, v.data))
  );
export const useMarkGroupReady = () =>
  useAcademicsMutation(async (id: string) => unwrap(await groupsApi.markGroupReady(id)));
export const useCancelGroup = () =>
  useAcademicsMutation(async (v: { id: string; reason: string }) =>
    unwrap(await groupsApi.cancelGroup(v.id, v.reason))
  );
export const useSetContentSent = () =>
  useAcademicsMutation(async (v: { id: string; done: boolean }) =>
    unwrap(await groupsApi.setContentSent(v.id, v.done))
  );
export const useAddStudent = () =>
  useAcademicsMutation(async (v: { id: string; studentId: string }) =>
    unwrap(await groupsApi.addStudent(v.id, v.studentId))
  );
export const useRemoveStudent = () =>
  useAcademicsMutation(async (v: { id: string; studentId: string }) =>
    unwrap(await groupsApi.removeStudent(v.id, v.studentId))
  );
export const useSetWhatsapp = () =>
  useAcademicsMutation(async (v: { id: string; studentId: string; whatsappAdded: boolean }) =>
    unwrap(await groupsApi.setWhatsapp(v.id, v.studentId, v.whatsappAdded))
  );
export const useAssignTeacher = () =>
  useAcademicsMutation(async (v: { id: string; teacherId: string }) =>
    unwrap(await groupsApi.assignTeacher(v.id, v.teacherId))
  );
export const useUnassignTeacher = () =>
  useAcademicsMutation(async (id: string) => unwrap(await groupsApi.unassignTeacher(id)));
export const useSaveMyAvailability = () =>
  useAcademicsMutation(async (v: { timezone: string; slots: AvailabilitySlot[] }) =>
    unwrap(await availabilityApi.saveMyAvailability(v))
  );
export const useSetAdditionalRoles = () =>
  useAcademicsMutation(async (v: { userId: string; additionalRoles: Roles[] }) =>
    unwrap(await setAdditionalRoles(v.userId, v.additionalRoles))
  );

export const useSessions = (query: SessionQuery, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.sessions(query),
    refetchOnMount: true,
    queryFn: async () => unwrap(await sessionsApi.getSessions(query)),
    enabled,
  });
export const useSession = (id: string) =>
  useQuery({
    queryKey: academicsKeys.session(id),
    refetchOnMount: true,
    queryFn: async () => unwrap(await sessionsApi.getSession(id)),
    enabled: !!id,
  });
export const useFollowUps = (groupId: string, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.followUps(groupId),
    refetchOnMount: true,
    queryFn: async () => unwrap(await followUpsApi.getFollowUps(groupId)),
    enabled: enabled && !!groupId,
  });
export const useStartGroup = () =>
  useAcademicsMutation(async (id: string) => unwrap(await sessionsApi.startGroup(id)));
export const useCreateSession = () =>
  useAcademicsMutation(async (v: { groupId: string; startsAt: string; endsAt: string; teacherId?: string }) =>
    unwrap(await sessionsApi.createSession(v))
  );
export const useRescheduleSession = () =>
  useAcademicsMutation(async (v: { id: string; startsAt: string; endsAt: string }) =>
    unwrap(await sessionsApi.rescheduleSession(v))
  );
export const useDeleteSession = () =>
  useAcademicsMutation(async (id: string) => unwrap(await sessionsApi.deleteSession(id)));
export const useCancelSession = () =>
  useAcademicsMutation(async (v: { id: string; reason: string }) =>
    unwrap(await sessionsApi.cancelSession(v.id, v.reason))
  );
export const useMarkAttendance = () =>
  useAcademicsMutation(async (v: { id: string; entries: AttendanceEntry[] }) =>
    unwrap(await sessionsApi.markAttendance(v.id, v.entries))
  );
export const useMarkTeacherAttendance = () =>
  useAcademicsMutation(async (v: { id: string; status: AttendanceStatus }) =>
    unwrap(await sessionsApi.markTeacherAttendance(v.id, v.status))
  );
export const useSubmitReport = () =>
  useAcademicsMutation(async (v: { id: string; data: ReportValues }) =>
    unwrap(await sessionsApi.submitReport(v.id, v.data))
  );
export const useEditReport = () =>
  useAcademicsMutation(async (v: { id: string; data: ReportValues }) =>
    unwrap(await sessionsApi.editReport(v.id, v.data))
  );
export const useUpdateFollowUp = () =>
  useAcademicsMutation(
    async (v: { id: string; data: { parentFeedback?: string; decision?: FollowUpDecision } }) =>
      unwrap(await followUpsApi.updateFollowUp(v.id, v.data))
  );
export const useMyTasks = (query: TaskQuery, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.myTasks(query),
    refetchOnMount: true,
    queryFn: async (): Promise<ITasks> => unwrap(await tasksApi.getMyTasks(query)),
    enabled,
  });
export const useGroupTasks = (groupId: string, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.groupTasks(groupId),
    refetchOnMount: true,
    queryFn: async (): Promise<ITasks> => unwrap(await tasksApi.getGroupTasks(groupId)),
    enabled: enabled && Boolean(groupId),
  });
export const useMarkTaskDone = () =>
  useAcademicsMutation(async (id: string): Promise<ITask> =>
    unwrap(await tasksApi.markTaskDone(id))
  );

export const useEvaluations = (query: EvaluationQuery, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.evaluations(query),
    refetchOnMount: true,
    queryFn: async () => unwrap(await supervisionApi.getEvaluations(query)),
    enabled,
  });

export const useSessionEvaluations = (sessionId: string, enabled = true) =>
  useQuery({
    queryKey: academicsKeys.sessionEvaluations(sessionId),
    refetchOnMount: true,
    queryFn: async () => unwrap(await supervisionApi.getSessionEvaluations(sessionId)),
    enabled: enabled && Boolean(sessionId),
  });

export const useCreateEvaluation = () =>
  useAcademicsMutation(async (vars: { sessionId: string; data: SupervisionScores }) =>
    unwrap(await supervisionApi.createEvaluation(vars.sessionId, vars.data))
  );

export const useUpdateEvaluation = () =>
  useAcademicsMutation(async (vars: { id: string; data: SupervisionScores }) =>
    unwrap(await supervisionApi.updateEvaluation(vars.id, vars.data))
  );
