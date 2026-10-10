import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from '../../services/attendance.service';
import { MarkAttendanceDto } from '../../dto/mark-attendance.dto';
import { BulkMarkAttendanceDto } from '../../dto/bulk-mark-attendance.dto';
import { AttendanceReportDto } from '../../dto/attendance-report.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserDocument } from '../../../user/entities/user.entity';
import { AuthGuard } from '../../../auth/guards/auth.guard';
import { StudentMarkByQrDto } from '../../dto/student-mark-by-qr.dto';
import { GetStudentCourseHistoryDto } from '../../dto/get-student-course-history.dto';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { RateLimit } from 'src/rate-limiter/rate-limiter.decorator';

@Controller('attendance')
@UseGuards(AuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  markAttendance(@Body() dto: MarkAttendanceDto, @CurrentUser() user: UserDocument) {
    // Permission check could be more granular here (e.g. is user instructor/admin)
    return this.attendanceService.markAttendance(dto, user._id.toString());
  }

  @Post('bulk-mark')
  bulkMarkAttendance(@Body() dto: BulkMarkAttendanceDto, @CurrentUser() user: UserDocument) {
    return this.attendanceService.bulkMarkAttendance(dto, user._id.toString());
  }

  @Get('course/:courseId')
  getAttendanceBySession(
    @Param('courseId') courseId: string,
    @Query('slotId') slotId: string,
    @Query('date') date: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    return this.attendanceService.getAttendanceBySession(courseId, slotId, new Date(date), {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('student/:studentId')
  getStudentAttendance(@Param('studentId') studentId: string, @Query('courseId') courseId: string) {
    return this.attendanceService.getStudentAttendance(studentId, courseId);
  }

  // Self-service (mobile): the logged-in student's own scheduled courses + per-course history.
  @Get('student/me/scheduled-courses')
  getMyScheduledCourses(@CurrentUser() user: UserDocument) {
    return this.attendanceService.getStudentScheduledCourses(user._id.toString());
  }

  @Get('student/me/history')
  getMyCourseHistory(@CurrentUser() user: UserDocument, @Query() query: GetStudentCourseHistoryDto) {
    return this.attendanceService.getStudentCourseHistory(user._id.toString(), query.courseId, query);
  }

  @Get('reports')
  generateReport(@Query() dto: AttendanceReportDto) {
    return this.attendanceService.generateReport(dto);
  }

  @RateLimit({ ttlSeconds: 60, maxRequests: 3 })
  @Post('student/qr')
  studentMarkByQr(@CurrentUser() user: UserDocument, @Body() dto: StudentMarkByQrDto) {
    return this.attendanceService.studentMarkByQr(convertObjectValuesToObjectId(dto), convertObjectValuesToObjectId(user._id.toString()));
  }
}
