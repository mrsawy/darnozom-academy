'use server';

import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  IPrivateSession,
  ISessionBooking,
  ISlotAvailability,
  IBookSessionForm,
  IRescheduleForm,
  IRefundRequestForm,
} from '@/lib/types/private-session/private-session.interface';

// ─── Session CRUD (instructor) ─────────────────────────────────────────────────

export async function createPrivateSession(
  data: Omit<IBookSessionForm, 'sessionId' | 'scheduledDate' | 'startTime' | 'endTime'> &
    Record<string, unknown>
) {
  return createAuthorizedNatsRequest<{ message: string; session: IPrivateSession }>(
    'privateSessions.create',
    data
  );
}

export async function updatePrivateSession(sessionId: string, data: Record<string, unknown>) {
  return createAuthorizedNatsRequest<{ message: string; session: IPrivateSession }>(
    'privateSessions.update',
    { sessionId, ...data }
  );
}

export async function deletePrivateSession(sessionId: string) {
  return createAuthorizedNatsRequest<{ message: string }>('privateSessions.delete', { sessionId });
}

export async function getMyPrivateSessions(options?: Record<string, unknown>) {
  return createAuthorizedNatsRequest<{ docs: IPrivateSession[]; totalDocs: number }>(
    'privateSessions.getMySessions',
    { options: options ?? {} }
  );
}

export async function getPrivateSessionById(sessionId: string) {
  return createNatsRequest<IPrivateSession>('privateSessions.getById', { sessionId });
}

export async function getInstructorAvailableSessions(instructorId: string) {
  return createNatsRequest<IPrivateSession[]>('privateSessions.getByInstructor', { instructorId });
}

// ─── Slot availability (public) ───────────────────────────────────────────────

export async function getSlotAvailability(sessionId: string) {
  return createNatsRequest<ISlotAvailability[]>('privateSessions.slotAvailability', { sessionId });
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export async function bookPrivateSession(data: IBookSessionForm) {
  return createAuthorizedNatsRequest<{
    message: string;
    booking: ISessionBooking;
    paymentUrl?: string;
  }>('privateSessions.book', data);
}

export async function cancelBooking(bookingId: string, reason?: string) {
  return createAuthorizedNatsRequest<{ message: string }>('privateSessions.cancelBooking', {
    bookingId,
    reason,
  });
}

export async function getStudentBookings(options?: Record<string, unknown>) {
  return createAuthorizedNatsRequest<{ docs: ISessionBooking[]; totalDocs: number }>(
    'privateSessions.getStudentBookings',
    { options: options ?? {} }
  );
}

export async function getInstructorBookings(options?: Record<string, unknown>) {
  return createAuthorizedNatsRequest<{ docs: ISessionBooking[]; totalDocs: number }>(
    'privateSessions.getInstructorBookings',
    { options: options ?? {} }
  );
}

// ─── Reschedule ───────────────────────────────────────────────────────────────

export async function requestReschedule(data: IRescheduleForm) {
  return createAuthorizedNatsRequest<{ message: string; booking: ISessionBooking }>(
    'privateSessions.requestReschedule',
    data
  );
}

export async function respondToReschedule(
  bookingId: string,
  action: 'APPROVED' | 'REJECTED',
  rejectionReason?: string
) {
  return createAuthorizedNatsRequest<{ message: string; booking: ISessionBooking }>(
    'privateSessions.respondReschedule',
    { bookingId, action, rejectionReason }
  );
}

// ─── Cancel-and-refund ────────────────────────────────────────────────────────

export async function requestRefund(data: IRefundRequestForm) {
  return createAuthorizedNatsRequest<{ message: string; booking: ISessionBooking }>(
    'privateSessions.requestRefund',
    data
  );
}

export async function respondToRefund(
  bookingId: string,
  action: 'APPROVED' | 'REJECTED',
  rejectionReason?: string
) {
  return createAuthorizedNatsRequest<{ message: string; booking: ISessionBooking }>(
    'privateSessions.respondRefund',
    { bookingId, action, rejectionReason }
  );
}

// ─── Instructor post-session ──────────────────────────────────────────────────

export async function markSessionCompleted(bookingId: string) {
  return createAuthorizedNatsRequest<{ message: string }>('privateSessions.markCompleted', {
    bookingId,
  });
}

export async function markSessionNoShow(bookingId: string) {
  return createAuthorizedNatsRequest<{ message: string }>('privateSessions.markNoShow', {
    bookingId,
  });
}
