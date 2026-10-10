import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { StudentService } from '../../services/student.service';

@ApplyRpcErrorHandling
@Controller('student')
export class StudentControllerMessage {
  constructor(private readonly studentService: StudentService) {}

  @MessagePattern('students.calendar')
  @UseGuards(AuthGuard)
  async getCalendar(@Ctx() context: IUserContext, @Payload() payload?: { fromDate?: string; toDate?: string }) {
    const rawOrgId = context.userPayload.organizationId;
    const organizationId = rawOrgId ? new mongoose.Types.ObjectId(rawOrgId) : undefined;
    const result = await this.studentService.getCalendar(
      new mongoose.Types.ObjectId(context.userPayload._id),
      organizationId,
      payload?.fromDate,
      payload?.toDate
    );
    return result;
  }
}
