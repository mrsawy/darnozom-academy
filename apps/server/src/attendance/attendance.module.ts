import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from './entities/attendance.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { Course, CourseSchema } from '../course/entities/course.entity';
import { AttendanceService } from './services/attendance.service';
import { AttendanceDerivationService } from './services/attendance-derivation.service';
import { AttendanceMessageController } from './controllers/message/attendance.controller.message';
import { CourseModule } from '../course/course.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { UserModule } from '../user/user.module';
import { AttendanceController } from './controllers/http/attendance.controller.http';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    CourseModule,
    EnrollmentModule,
    UserModule,
    AuthModule,
    RoleModule,
  ],
  controllers: [AttendanceController, AttendanceMessageController],
  providers: [AttendanceService, AttendanceDerivationService],
  exports: [AttendanceService, AttendanceDerivationService],
})
export class AttendanceModule {}
