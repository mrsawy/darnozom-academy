import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserControllerHttp } from './controllers/http/user.controller.http';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { InstructorControllerHttp } from './controllers/http/instructor.controller.http';
import { RoleModule } from 'src/role/role.module';
import { UserControllerMessage } from './controllers/message/user.controller.message';
import { WalletModule } from 'src/wallet/wallet.module';
import { InstructorService } from './services/instructor.service';
import { InstructorControllerMessage } from './controllers/message/instructor.controller.message';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { ParentControllerHttp } from './controllers/http/parent.controller.http';
import { ParentControllerMessage } from './controllers/message/parent.controller.message';
import { ParentService } from './services/parent.service';
import { StudentService } from './services/student.service';
import { Enrollment, EnrollmentSchema } from 'src/enrollment/entities/enrollment.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { CourseModuleEntity, CourseModuleSchema } from 'src/course/entities/course-module.entity';
import { CourseContent, CourseContentSchema } from 'src/course/entities/course-content.entity';
import { StudentControllerHttp } from './controllers/http/student.controller.http';
import { StudentControllerMessage } from './controllers/message/student.controller.message';
import { SessionBooking, SessionBookingSchema } from 'src/private-session/entities/session-booking.entity';
import { PrivateSession, PrivateSessionSchema } from 'src/private-session/entities/private-session.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Course.name, schema: CourseSchema },
      { name: CourseModuleEntity.name, schema: CourseModuleSchema },
      { name: CourseContent.name, schema: CourseContentSchema },
      { name: SessionBooking.name, schema: SessionBookingSchema },
      { name: PrivateSession.name, schema: PrivateSessionSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
    forwardRef(() => WalletModule),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [
    UserControllerHttp,
    UserControllerMessage,
    InstructorControllerHttp,
    InstructorControllerMessage,
    ParentControllerHttp,
    ParentControllerMessage,
    StudentControllerHttp,
    StudentControllerMessage,
  ],
  providers: [UserService, InstructorService, ParentService, StudentService],
  exports: [UserService, InstructorService, ParentService, StudentService],
})
export class UserModule {}
