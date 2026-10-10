import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PaginateOptions } from 'mongoose';
import { AuthGuard as HttpAuthGuard } from 'src/auth/guards/auth.guard';
import { PrivateSessionService } from '../../services/private-session.service';
import { SessionBookingService } from '../../services/session-booking.service';
import { CreatePrivateSessionDto } from '../../dto/create-private-session.dto';
import { UpdatePrivateSessionDto } from '../../dto/update-private-session.dto';
import { BookSessionDto } from '../../dto/book-session.dto';
import { RescheduleRequestDto } from '../../dto/reschedule-request.dto';
import { RespondRescheduleDto } from '../../dto/respond-reschedule.dto';
import { RefundRequestDto } from '../../dto/refund-request.dto';
import { RespondRefundDto } from '../../dto/respond-refund.dto';

interface IUserRequest {
  user: {
    _id: string;
    organizationId?: string;
    roleName: string;
  };
}

@Controller('private-sessions')
export class PrivateSessionControllerHttp {
  constructor(
    private readonly privateSessionService: PrivateSessionService,
    private readonly sessionBookingService: SessionBookingService
  ) {}

  // ─── Session CRUD ────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(HttpAuthGuard)
  async create(@Body() dto: CreatePrivateSessionDto, @Request() req: IUserRequest) {
    return this.privateSessionService.create(dto, req.user._id, req.user.organizationId!);
  }

  @Put(':id')
  @UseGuards(HttpAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdatePrivateSessionDto, @Request() req: IUserRequest) {
    return this.privateSessionService.update(id, dto, req.user._id);
  }

  @Delete(':id')
  @UseGuards(HttpAuthGuard)
  async delete(@Param('id') id: string, @Request() req: IUserRequest) {
    return this.privateSessionService.delete(id, req.user._id, req.user._id);
  }

  @Get('my')
  @UseGuards(HttpAuthGuard)
  async getMySessions(@Request() req: IUserRequest, @Query() options: PaginateOptions) {
    return this.privateSessionService.findByInstructor(req.user._id, req.user.organizationId!, options);
  }

  @Get('instructor/:instructorId')
  async getByInstructor(@Param('instructorId') instructorId: string) {
    return this.privateSessionService.findAvailableByInstructor(instructorId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.privateSessionService.findById(id);
  }

  // ─── Booking ─────────────────────────────────────────────────────────────────

  @Post('book')
  @UseGuards(HttpAuthGuard)
  async book(@Body() dto: BookSessionDto, @Request() req: IUserRequest) {
    return this.sessionBookingService.bookSession(dto, req.user._id, req.user.organizationId!);
  }

  @Put('bookings/:id/cancel')
  @UseGuards(HttpAuthGuard)
  async cancelBooking(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: IUserRequest) {
    return this.sessionBookingService.cancelBooking(id, req.user._id, body.reason);
  }

  @Get('bookings/student')
  @UseGuards(HttpAuthGuard)
  async getStudentBookings(@Request() req: IUserRequest, @Query() options: PaginateOptions) {
    return this.sessionBookingService.getBookingsForStudent(req.user._id, req.user.organizationId!, options);
  }

  @Get('bookings/instructor')
  @UseGuards(HttpAuthGuard)
  async getInstructorBookings(@Request() req: IUserRequest, @Query() options: PaginateOptions) {
    return this.sessionBookingService.getBookingsForInstructor(req.user._id, req.user.organizationId!, options);
  }

  // ─── Reschedule ──────────────────────────────────────────────────────────────

  @Post('bookings/reschedule')
  @UseGuards(HttpAuthGuard)
  async requestReschedule(@Body() dto: RescheduleRequestDto, @Request() req: IUserRequest) {
    return this.sessionBookingService.requestReschedule(dto, req.user._id, req.user.roleName);
  }

  @Put('bookings/reschedule/respond')
  @UseGuards(HttpAuthGuard)
  async respondReschedule(@Body() dto: RespondRescheduleDto, @Request() req: IUserRequest) {
    return this.sessionBookingService.respondToReschedule(dto, req.user._id);
  }

  // ─── Cancel-and-refund ──────────────────────────────────────────────────────

  @Post('bookings/:id/refund-request')
  @UseGuards(HttpAuthGuard)
  async requestRefund(@Param('id') id: string, @Body() body: { reason: string }, @Request() req: IUserRequest) {
    const dto: RefundRequestDto = { bookingId: id, reason: body.reason };
    return this.sessionBookingService.requestRefund(dto, req.user._id);
  }

  @Put('bookings/refund/respond')
  @UseGuards(HttpAuthGuard)
  async respondRefund(@Body() dto: RespondRefundDto, @Request() req: IUserRequest) {
    return this.sessionBookingService.respondToRefund(dto, req.user._id);
  }

  // ─── Instructor post-session ──────────────────────────────────────────────────

  @Put('bookings/:id/complete')
  @UseGuards(HttpAuthGuard)
  async markCompleted(@Param('id') id: string, @Request() req: IUserRequest) {
    return this.sessionBookingService.markAsCompleted(id, req.user._id);
  }

  @Put('bookings/:id/no-show')
  @UseGuards(HttpAuthGuard)
  async markNoShow(@Param('id') id: string, @Request() req: IUserRequest) {
    return this.sessionBookingService.markAsNoShow(id, req.user._id);
  }
}
