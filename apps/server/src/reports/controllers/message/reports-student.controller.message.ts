import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { Subjects, Actions } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { StudentReportsService } from '../../services/student-reports.service';
import { GetStudentReportsDto } from '../../dto/get-student-reports.dto';

@ApplyRpcErrorHandling
@Controller('reports')
export class ReportsStudentControllerMessage {
  constructor(private readonly studentReportsService: StudentReportsService) {}

  @MessagePattern('reports.studentDashboard')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.STUDENT_REPORT })
  @UseGuards(AuthGuard)
  async getStudentDashboard(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: GetStudentReportsDto) {
    return this.studentReportsService.getDashboard(new mongoose.Types.ObjectId(context.userPayload._id), payload);
  }
}
