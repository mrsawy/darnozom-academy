import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Ctx } from '@nestjs/microservices';
import { AttendanceService } from '../../services/attendance.service';
import { MarkAttendanceDto } from '../../dto/mark-attendance.dto';
import { BulkMarkAttendanceDto } from '../../dto/bulk-mark-attendance.dto';
import { AttendanceReportDto } from '../../dto/attendance-report.dto';
import { StudentMarkByQrDto } from '../../dto/student-mark-by-qr.dto';
import { GetStudentCourseHistoryDto, GetStudentCourseHistoryForStaffDto } from '../../dto/get-student-course-history.dto';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { AuthGuard } from '../../../auth/guards/auth.guard';
import { IUserContext } from '../../../utils/types/IUserContext.interface';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RateLimit } from 'src/rate-limiter/rate-limiter.decorator';

@ApplyRpcErrorHandling
@Controller()
export class AttendanceMessageController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.markAttendance')
  markAttendance(@Payload() data: { dto: MarkAttendanceDto }, @Ctx() context: IUserContext) {
    return this.attendanceService.markAttendance(data.dto, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.bulkMarkAttendance')
  bulkMarkAttendance(@Payload() data: { dto: BulkMarkAttendanceDto }, @Ctx() context: IUserContext) {
    return this.attendanceService.bulkMarkAttendance(data.dto, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.clearAttendance')
  clearAttendance(@Payload() data: { courseId: string; slotId: string; studentId: string; date: string }, @Ctx() _context: IUserContext) {
    return this.attendanceService.clearAttendance({
      courseId: data.courseId,
      slotId: data.slotId,
      studentId: data.studentId,
      date: new Date(data.date),
    });
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.getByStudent')
  getByStudent(@Payload() data: { studentId: string; courseId: string }, @Ctx() _context: IUserContext) {
    return this.attendanceService.getStudentAttendance(data.studentId, data.courseId);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.getBySession')
  getBySession(
    @Payload() data: { courseId: string; slotId: string; date: string; page?: number; limit?: number; search?: string },
    @Ctx() _context: IUserContext
  ) {
    return this.attendanceService.getAttendanceBySession(data.courseId, data.slotId, new Date(data.date), {
      page: data.page,
      limit: data.limit,
      search: data.search,
    });
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.generateReport')
  generateReport(@Payload() data: { dto: AttendanceReportDto }, @Ctx() _context: IUserContext) {
    return this.attendanceService.generateReport(data.dto);
  }

  // ── Student self-service (own data only; studentId is taken from the auth context, never the payload) ──

  @UseGuards(AuthGuard)
  @MessagePattern('attendance.getStudentScheduledCourses')
  getStudentScheduledCourses(@Payload() _data: unknown, @Ctx() context: IUserContext) {
    return this.attendanceService.getStudentScheduledCourses(context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('attendance.getStudentCourseHistory')
  getStudentCourseHistory(@Payload(new RpcValidationPipe()) payload: GetStudentCourseHistoryDto, @Ctx() context: IUserContext) {
    return this.attendanceService.getStudentCourseHistory(context.userPayload._id.toString(), payload.courseId, payload);
  }

  // ── Staff: view any student's history (requires READ ATTENDANCE) ──

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ATTENDANCE })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.getStudentCourseHistoryForStaff')
  getStudentCourseHistoryForStaff(@Payload(new RpcValidationPipe()) payload: GetStudentCourseHistoryForStaffDto, @Ctx() _context: IUserContext) {
    return this.attendanceService.getStudentCourseHistory(payload.studentId, payload.courseId, payload);
  }

  @RateLimit({ ttlSeconds: 60, maxRequests: 3 })
  @UseGuards(AuthGuard)
  @MessagePattern('attendance.studentMarkByQr')
  studentMarkByQr(@Payload() data: { dto: StudentMarkByQrDto }, @Ctx() context: IUserContext) {
    return this.attendanceService.studentMarkByQr(
      convertObjectValuesToObjectId(data.dto),
      convertObjectValuesToObjectId(context.userPayload._id.toString())
    );
  }
}
