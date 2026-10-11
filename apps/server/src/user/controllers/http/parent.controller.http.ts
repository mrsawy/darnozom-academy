import { BadRequestException, Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import mongoose from 'mongoose';
import { Roles } from '@darnozom/shared-types';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { handleError } from 'src/utils/errorHandling';
import { ParentService } from '../../services/parent.service';

@Controller('parent')
export class ParentControllerHttp {
  constructor(private readonly parentService: ParentService) {}

  @Get('students/progress')
  @UseGuards(AuthGuard)
  async getRelatedStudentsProgress(@Request() req: IUserRequest) {
    try {
      if (req.user.roleName !== Roles.PARENT) {
        throw new BadRequestException('Only parent accounts can access this endpoint');
      }

      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      return await this.parentService.getRelatedStudentsProgress(
        new mongoose.Types.ObjectId(req.user._id),
        new mongoose.Types.ObjectId(req.user.organizationId)
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(String(error));
      }
    }
  }

  @Get('students/:studentId/progress')
  @UseGuards(AuthGuard)
  async getSingleRelatedStudentProgress(@Param('studentId') studentId: string, @Request() req: IUserRequest) {
    try {
      if (req.user.roleName !== Roles.PARENT) {
        throw new BadRequestException('Only parent accounts can access this endpoint');
      }

      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      return await this.parentService.getSingleRelatedStudentProgress(
        new mongoose.Types.ObjectId(req.user._id),
        new mongoose.Types.ObjectId(studentId),
        new mongoose.Types.ObjectId(req.user.organizationId)
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(String(error));
      }
    }
  }
}
