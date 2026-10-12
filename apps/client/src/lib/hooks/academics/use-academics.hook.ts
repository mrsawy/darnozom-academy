'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import type { AvailabilitySlot, GroupPaymentStatus, Roles } from '@darnozom/shared-types';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as programsApi from '@/lib/actions/academics/programs.action';
import * as structureApi from '@/lib/actions/academics/structure.action';
import * as groupsApi from '@/lib/actions/academics/groups.action';
import * as availabilityApi from '@/lib/actions/academics/teacher-availability.action';
import { setAdditionalRoles } from '@/lib/actions/academics/additional-roles.action';
import type { GroupFormValues, GroupQuery } from '@/lib/types/academics/academics';

const ROOT = 'academics';

export const academicsKeys = {
  programs: [ROOT, 'programs'] as const,
  program: (id: string) => [ROOT, 'program', id] as const,
  programCourses: (id: string) => [ROOT, 'program-courses', id] as const,
  courseOptions: [ROOT, 'course-options'] as const,
  levels: (courseId: string) => [ROOT, 'levels', courseId] as const,
  cohorts: (levelId: string) => [ROOT, 'cohorts', levelId] as const,
  groups: (query: GroupQuery) => [ROOT, 'groups', query] as const,
  group: (id: string) => [ROOT, 'group', id] as const,
  studentCandidates: (id: string, q: string) => [ROOT, 'student-candidates', id, q] as const,
  teacherCandidates: (id: string) => [ROOT, 'teacher-candidates', id] as const,
  myAvailability: [ROOT, 'my-availability'] as const,
};

export const usePrograms = () => useQuery({ queryKey: academicsKeys.programs, queryFn: async () => unwrap(await programsApi.getPrograms()) });
export const useProgram = (id: string) =>
  useQuery({ queryKey: academicsKeys.program(id), queryFn: async () => unwrap(await programsApi.getProgram(id)), enabled: !!id });
export const useProgramCourses = (id: string) =>
  useQuery({ queryKey: academicsKeys.programCourses(id), queryFn: async () => unwrap(await programsApi.getProgramCourses(id)), enabled: !!id });
export const useCourseOptions = () =>
  useQuery({ queryKey: academicsKeys.courseOptions, queryFn: async () => unwrap(await programsApi.getCourseOptions()) });
export const useLevels = (courseId: string) =>
  useQuery({ queryKey: academicsKeys.levels(courseId), queryFn: async () => unwrap(await structureApi.getLevels(courseId)), enabled: !!courseId });
export const useCohorts = (levelId: string) =>
  useQuery({ queryKey: academicsKeys.cohorts(levelId), queryFn: async () => unwrap(await structureApi.getCohorts(levelId)), enabled: !!levelId });
export const useGroups = (query: GroupQuery) =>
  useQuery({ queryKey: academicsKeys.groups(query), queryFn: async () => unwrap(await groupsApi.getGroups(query)) });
export const useGroup = (id: string) =>
  useQuery({ queryKey: academicsKeys.group(id), queryFn: async () => unwrap(await groupsApi.getGroup(id)), enabled: !!id });
export const useStudentCandidates = (id: string, q: string) =>
  useQuery({ queryKey: academicsKeys.studentCandidates(id, q), queryFn: async () => unwrap(await groupsApi.getStudentCandidates(id, q)), enabled: !!id });
export const useTeacherCandidates = (id: string) =>
  useQuery({ queryKey: academicsKeys.teacherCandidates(id), queryFn: async () => unwrap(await groupsApi.getTeacherCandidates(id)), enabled: !!id });
export const useMyAvailability = () =>
  useQuery({ queryKey: academicsKeys.myAvailability, queryFn: async () => unwrap(await availabilityApi.getMyAvailability()) });

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

export const useCreateProgram = () => useAcademicsMutation(async (v: { name: string; description?: string }) => unwrap(await programsApi.createProgram(v)));
export const useDeleteProgram = () => useAcademicsMutation(async (id: string) => unwrap(await programsApi.deleteProgram(id)));
export const useLinkCourse = () => useAcademicsMutation(async (v: { programId: string; courseId: string }) => unwrap(await programsApi.linkCourse(v.programId, v.courseId)));
export const useUnlinkCourse = () => useAcademicsMutation(async (courseId: string) => unwrap(await programsApi.unlinkCourse(courseId)));
export const useCreateLevel = () => useAcademicsMutation(async (v: { courseId: string; name: string; order: number }) => unwrap(await structureApi.createLevel(v)));
export const useDeleteLevel = () => useAcademicsMutation(async (id: string) => unwrap(await structureApi.deleteLevel(id)));
export const useCreateCohort = () => useAcademicsMutation(async (v: { levelId: string; name: string; startDate: string }) => unwrap(await structureApi.createCohort(v)));
export const useDeleteCohort = () => useAcademicsMutation(async (id: string) => unwrap(await structureApi.deleteCohort(id)));
export const useCreateGroup = () => useAcademicsMutation(async (v: GroupFormValues & { cohortId: string }) => unwrap(await groupsApi.createGroup(v)));
export const useUpdateGroup = () => useAcademicsMutation(async (v: { id: string; data: Partial<GroupFormValues> }) => unwrap(await groupsApi.updateGroup(v.id, v.data)));
export const useMarkGroupReady = () => useAcademicsMutation(async (id: string) => unwrap(await groupsApi.markGroupReady(id)));
export const useCancelGroup = () => useAcademicsMutation(async (v: { id: string; reason: string }) => unwrap(await groupsApi.cancelGroup(v.id, v.reason)));
export const useSetContentSent = () => useAcademicsMutation(async (v: { id: string; done: boolean }) => unwrap(await groupsApi.setContentSent(v.id, v.done)));
export const useAddStudent = () => useAcademicsMutation(async (v: { id: string; studentId: string }) => unwrap(await groupsApi.addStudent(v.id, v.studentId)));
export const useRemoveStudent = () => useAcademicsMutation(async (v: { id: string; studentId: string }) => unwrap(await groupsApi.removeStudent(v.id, v.studentId)));
export const useSetPaymentStatus = () =>
  useAcademicsMutation(async (v: { id: string; studentId: string; paymentStatus: GroupPaymentStatus }) => unwrap(await groupsApi.setPaymentStatus(v.id, v.studentId, v.paymentStatus)));
export const useSetWhatsapp = () =>
  useAcademicsMutation(async (v: { id: string; studentId: string; whatsappAdded: boolean }) => unwrap(await groupsApi.setWhatsapp(v.id, v.studentId, v.whatsappAdded)));
export const useAssignTeacher = () => useAcademicsMutation(async (v: { id: string; teacherId: string }) => unwrap(await groupsApi.assignTeacher(v.id, v.teacherId)));
export const useUnassignTeacher = () => useAcademicsMutation(async (id: string) => unwrap(await groupsApi.unassignTeacher(id)));
export const useSaveMyAvailability = () =>
  useAcademicsMutation(async (v: { timezone: string; slots: AvailabilitySlot[] }) => unwrap(await availabilityApi.saveMyAvailability(v)));
export const useSetAdditionalRoles = () =>
  useAcademicsMutation(async (v: { userId: string; additionalRoles: Roles[] }) => unwrap(await setAdditionalRoles(v.userId, v.additionalRoles)));
