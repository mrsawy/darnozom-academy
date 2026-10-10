import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { PaginateOptions } from 'mongoose';
import { Actions, Subjects } from '@lms-organization/shared-types';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { PrivateSessionService } from '../../services/private-session.service';
import { SessionBookingService } from '../../services/session-booking.service';
import { CreatePrivateSessionDto } from '../../dto/create-private-session.dto';
import { UpdatePrivateSessionDto } from '../../dto/update-private-session.dto';
import { BookSessionDto } from '../../dto/book-session.dto';
import { RescheduleRequestDto } from '../../dto/reschedule-request.dto';
import { RespondRescheduleDto } from '../../dto/respond-reschedule.dto';
import { RefundRequestDto } from '../../dto/refund-request.dto';
import { RespondRefundDto } from '../../dto/respond-refund.dto';

@ApplyRpcErrorHandling
@Controller()
export class PrivateSessionControllerMessage {
  constructor(
    private readonly privateSessionService: PrivateSessionService,
    private readonly sessionBookingService: SessionBookingService
  ) {}

  // ─── Session CRUD ────────────────────────────────────────────────────────────

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.PRIVATE_SESSION })
  @MessagePattern('privateSessions.create')
  async create(@Payload(new RpcValidationPipe()) payload: CreatePrivateSessionDto, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.privateSessionService.create(payload, user._id.toString(), user.organizationId!.toString());
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PRIVATE_SESSION })
  @MessagePattern('privateSessions.update')
  async update(@Payload(new RpcValidationPipe()) payload: UpdatePrivateSessionDto & { sessionId: string }, @Ctx() context: IUserContext) {
    return this.privateSessionService.update(payload.sessionId, payload, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.PRIVATE_SESSION })
  @MessagePattern('privateSessions.delete')
  async delete(@Payload(new RpcValidationPipe()) payload: { sessionId: string }, @Ctx() context: IUserContext) {
    return this.privateSessionService.delete(payload.sessionId, context.userPayload._id.toString(), context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.getMySessions')
  async getMySessions(@Payload() payload: { options?: PaginateOptions }, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.privateSessionService.findByInstructor(user._id.toString(), user.organizationId!.toString(), payload.options ?? {});
  }

  @MessagePattern('privateSessions.getById')
  async getById(@Payload() payload: { sessionId: string }) {
    return this.privateSessionService.findById(payload.sessionId);
  }

  @MessagePattern('privateSessions.getByInstructor')
  async getByInstructor(@Payload() payload: { instructorId: string }) {
    return this.privateSessionService.findAvailableByInstructor(payload.instructorId);
  }

  // ─── Booking ─────────────────────────────────────────────────────────────────
  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.book')
  async book(@Payload(new RpcValidationPipe()) payload: BookSessionDto, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.sessionBookingService.bookSession(payload, user._id.toString(), user.organizationId!.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.cancelBooking')
  async cancelBooking(@Payload() payload: { bookingId: string; reason?: string }, @Ctx() context: IUserContext) {
    return this.sessionBookingService.cancelBooking(payload.bookingId, context.userPayload._id.toString(), payload.reason);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.getStudentBookings')
  async getStudentBookings(@Payload() payload: { options?: PaginateOptions }, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.sessionBookingService.getBookingsForStudent(user._id.toString(), user.organizationId!.toString(), payload.options ?? {});
  }

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.getInstructorBookings')
  async getInstructorBookings(@Payload() payload: { options?: PaginateOptions }, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.sessionBookingService.getBookingsForInstructor(user._id.toString(), user.organizationId!.toString(), payload.options ?? {});
  }

  // ─── Reschedule ──────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.requestReschedule')
  async requestReschedule(@Payload(new RpcValidationPipe()) payload: RescheduleRequestDto, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.sessionBookingService.requestReschedule(payload, user._id.toString(), user.roleName);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.respondReschedule')
  async respondReschedule(@Payload(new RpcValidationPipe()) payload: RespondRescheduleDto, @Ctx() context: IUserContext) {
    return this.sessionBookingService.respondToReschedule(payload, context.userPayload._id.toString());
  }

  // ─── Cancel-and-refund ──────────────────────────────────────────────────────

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.requestRefund')
  async requestRefund(@Payload(new RpcValidationPipe()) payload: RefundRequestDto, @Ctx() context: IUserContext) {
    return this.sessionBookingService.requestRefund(payload, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.respondRefund')
  async respondRefund(@Payload(new RpcValidationPipe()) payload: RespondRefundDto, @Ctx() context: IUserContext) {
    return this.sessionBookingService.respondToRefund(payload, context.userPayload._id.toString());
  }

  // ─── Slot availability (public) ───────────────────────────────────────────────

  @MessagePattern('privateSessions.slotAvailability')
  async getSlotAvailability(@Payload() payload: { sessionId: string }) {
    return this.sessionBookingService.getSlotAvailability(payload.sessionId);
  }

  // ─── Instructor actions ───────────────────────────────────────────────────────

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.markCompleted')
  async markCompleted(@Payload() payload: { bookingId: string }, @Ctx() context: IUserContext) {
    return this.sessionBookingService.markAsCompleted(payload.bookingId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('privateSessions.markNoShow')
  async markNoShow(@Payload() payload: { bookingId: string }, @Ctx() context: IUserContext) {
    return this.sessionBookingService.markAsNoShow(payload.bookingId, context.userPayload._id.toString());
  }
}
