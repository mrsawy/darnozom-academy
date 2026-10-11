import { BadRequestException, Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import mongoose from 'mongoose';
import { Roles } from '@darnozom/shared-types';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { handleError } from 'src/utils/errorHandling';
import { StudentService } from '../../services/student.service';
import { GetStudentCalendarDto } from '../../dto/get-student-calendar.dto';

@Controller('student')
export class StudentControllerHttp {
  constructor(private readonly studentService: StudentService) {}

  @Get('calendar')
  @UseGuards(AuthGuard)
  async getCalendar(@Query() query: GetStudentCalendarDto, @Request() req: IUserRequest) {
    try {
      if (req.user.roleName !== Roles.STUDENT) {
        throw new BadRequestException('Only student accounts can access this endpoint');
      }

      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const appointments = await this.studentService.getCalendar(
        new mongoose.Types.ObjectId(req.user._id),
        new mongoose.Types.ObjectId(req.user.organizationId),
        query.fromDate,
        query.toDate
      );

      return {
        message: 'Calendar fetched successfully',
        data: appointments,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(String(error));
      }
    }
  }
}
