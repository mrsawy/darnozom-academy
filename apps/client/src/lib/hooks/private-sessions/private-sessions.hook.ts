'use client';

import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import type {
  IPrivateSession,
  ISessionBooking,
  ISlotAvailability,
  IBookSessionForm,
  IRescheduleForm,
  IRefundRequestForm,
} from '@/lib/types/private-session/private-session.interface';
import {
  createPrivateSession,
  updatePrivateSession,
  deletePrivateSession,
  getMyPrivateSessions,
  getPrivateSessionById,
  getInstructorAvailableSessions,
  getSlotAvailability,
  bookPrivateSession,
  cancelBooking,
  getStudentBookings,
  getInstructorBookings,
  requestReschedule,
  respondToReschedule,
  requestRefund,
  respondToRefund,
  markSessionCompleted,
  markSessionNoShow,
} from '@/lib/actions/private-sessions/private-sessions.action';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

export const privateSessionKeys = {
  all: ['privateSessions'] as const,
  mine: () => [...privateSessionKeys.all, 'mine'] as const,
  byId: (id: string) => [...privateSessionKeys.all, 'detail', id] as const,
  byInstructor: (instructorId: string) =>
    [...privateSessionKeys.all, 'instructor', instructorId] as const,
  slotAvailability: (sessionId: string) =>
    [...privateSessionKeys.all, 'slotAvailability', sessionId] as const,
  bookings: {
    all: ['sessionBookings'] as const,
    student: () => [...privateSessionKeys.bookings.all, 'student'] as const,
    instructor: () => [...privateSessionKeys.bookings.all, 'instructor'] as const,
  },
};

export function useMyPrivateSessions(options?: Record<string, unknown>) {
  return useQuery<{ docs: IPrivateSession[]; totalDocs: number }>({
    queryKey: [...privateSessionKeys.mine(), options],
    queryFn: () => getMyPrivateSessions(options),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePrivateSessionById(sessionId: string | undefined) {
  return useQuery<IPrivateSession>({
    queryKey: privateSessionKeys.byId(sessionId ?? ''),
    queryFn: () => {
      if (!sessionId) throw new Error('sessionId is required');
      return getPrivateSessionById(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSlotAvailability(sessionId: string | null) {
  return useQuery<ISlotAvailability[]>({
    queryKey: privateSessionKeys.slotAvailability(sessionId ?? ''),
    queryFn: () => {
      if (!sessionId) throw new Error('sessionId is required');
      return getSlotAvailability(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}

export function useInstructorAvailableSessions(instructorId: string | undefined) {
  return useQuery<IPrivateSession[]>({
    queryKey: privateSessionKeys.byInstructor(instructorId ?? ''),
    queryFn: () => {
      if (!instructorId) throw new Error('instructorId is required');
      return getInstructorAvailableSessions(instructorId);
    },
    enabled: !!instructorId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreatePrivateSession() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string; session: IPrivateSession }, Error, Record<string, unknown>>(
    {
      mutationFn: async (data) => {
        const result = await createPrivateSession(
          data as Parameters<typeof createPrivateSession>[0]
        );
        return throwIfNatsError(result);
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: privateSessionKeys.mine() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );
}

export function useUpdatePrivateSession() {
  const queryClient = useQueryClient();
  return useMutation<
    { message: string; session: IPrivateSession },
    Error,
    { sessionId: string; data: Record<string, unknown> }
  >({
    mutationFn: async ({ sessionId, data }) => {
      const result = await updatePrivateSession(sessionId, data);
      return throwIfNatsError(result);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.mine() });
      void queryClient.invalidateQueries({
        queryKey: privateSessionKeys.byId(variables.sessionId),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePrivateSession() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (sessionId) => deletePrivateSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.mine() });
    },
  });
}

export function useBookPrivateSession() {
  const queryClient = useQueryClient();
  const tError = useTranslations('errors');
  return useMutation<
    { message: string; booking: ISessionBooking; paymentUrl?: string },
    Error,
    IBookSessionForm
  >({
    mutationFn: (data) => bookPrivateSession(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.bookings.student() });
    },
    onError: (error) => {
      toast.error(tError(error.message));
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, { bookingId: string; reason?: string }>({
    mutationFn: ({ bookingId, reason }) => cancelBooking(bookingId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.bookings.all });
    },
  });
}

export function useStudentBookings(options?: Record<string, unknown>) {
  return useQuery<{ docs: ISessionBooking[]; totalDocs: number }>({
    queryKey: [...privateSessionKeys.bookings.student(), options],
    queryFn: () => getStudentBookings(options),
    staleTime: 2 * 60 * 1000,
  });
}

export function useInstructorBookings(options?: Record<string, unknown>) {
  return useQuery<{ docs: ISessionBooking[]; totalDocs: number }>({
    queryKey: [...privateSessionKeys.bookings.instructor(), options],
    queryFn: () => getInstructorBookings(options),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRequestReschedule() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string; booking: ISessionBooking }, Error, IRescheduleForm>({
    mutationFn: (data) => requestReschedule(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.bookings.all });
    },
  });
}

export function useRespondToReschedule() {
  const queryClient = useQueryClient();
  return useMutation<
    { message: string; booking: ISessionBooking },
    Error,
    { bookingId: string; action: 'APPROVED' | 'REJECTED'; rejectionReason?: string }
  >({
    mutationFn: ({ bookingId, action, rejectionReason }) =>
      respondToReschedule(bookingId, action, rejectionReason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.bookings.all });
    },
  });
}

export function useRequestRefund() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string; booking: ISessionBooking }, Error, IRefundRequestForm>({
    mutationFn: (data) => requestRefund(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.bookings.all });
    },
  });
}

export function useRespondToRefund() {
  const queryClient = useQueryClient();
  return useMutation<
    { message: string; booking: ISessionBooking },
    Error,
    { bookingId: string; action: 'APPROVED' | 'REJECTED'; rejectionReason?: string }
  >({
    mutationFn: ({ bookingId, action, rejectionReason }) =>
      respondToRefund(bookingId, action, rejectionReason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.bookings.all });
    },
  });
}

export function useMarkSessionCompleted() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (bookingId) => markSessionCompleted(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.bookings.instructor() });
    },
  });
}

export function useMarkSessionNoShow() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (bookingId) => markSessionNoShow(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: privateSessionKeys.bookings.instructor() });
    },
  });
}
